import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import PDFPreview from "../../components/PDFPreview";
import {
  ensureManifest,
  getGrades,
  getSubjectsForGrade,
  getChaptersForGradeSubject,
  getTopicsForChapter,
  getChapterById,
  buildLocalPdfUrl,
} from "../../services/manifest";

import { enrichLOs as enrichLOsRAG, generateMicroplan as generateMicroplanRAG } from "../../services/rag";
import { enrichLOsLLM, generateMicroplanLLM } from "../../services/llmClient";


/* -------------------- helpers -------------------- */

// “smart” LO seeding that adapts to subject/topic
function seedLos({ subjectLabel, topicLabel }) {
  const s = (subjectLabel || "").toLowerCase();
  const t = topicLabel && topicLabel !== "(none)" ? ` in “${topicLabel}”` : "";

  if (s.includes("english")) {
    return [
      `Explain the key concept(s)${t}.`,
      "Identify key ideas, literary devices, and vocabulary in context.",
      "Analyze a short passage/poem and cite text evidence.",
      "Summarize the main points from the section.",
    ];
  }
  if (s.includes("science")) {
    return [
      `Explain the key concept(s)${t}.`,
      "Identify real-life applications/examples of the concept.",
      "Plan/interpret a simple investigation, observation, or data table.",
      "Summarize the main points from the section.",
    ];
  }
  if (s.includes("social")) {
    return [
      `Explain the key concept(s)${t}.`,
      "Connect the concept to historical/civic context and examples.",
      "Interpret a map/table/graph relevant to the chapter.",
      "Summarize the main points from the section.",
    ];
  }
  // math/default
  return [
    `Explain the key concept(s)${t}.`,
    "Identify real-life examples of the concept.",
    "Solve a numerical/example related to the concept.",
    "Summarize the main points from the section.",
  ];
}

// keep teacher edits: only reseed when LOs look “default”
function looksUntouched(los) {
  if (!Array.isArray(los) || los.length === 0) return true;
  const joined = los.map(s => String(s || "").trim().toLowerCase()).join("|");
  const stems = ["explain the key", "identify", "solve", "summarize", "analyze", "interpret"];
  const hits = stems.filter(k => joined.includes(k)).length;
  return hits >= Math.min(2, los.length);
}

function skeletonFromLOs(los, topic) {
  return [
    { title: "Starter / Hook", body: `Quick hook using ${topic ? `"${topic}"` : "a chapter cue"}.` },
    { title: "Teach / Model", body: "Explain the core idea with one worked example." },
    { title: "Practice", body: "3–5 targeted problems with immediate feedback." },
    {
      title: "Assess / Exit Ticket",
      body: `Exit ticket: 2 questions mapping to LO${los.length > 1 ? "s" : ""}.`,
    },
  ];
}

/* -------------------- component -------------------- */

export default function LessonPlanning() {
  // selects
  const [grade, setGrade] = useState(8);
  const [subject, setSubject] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topic, setTopic] = useState("");

  // option lists
  const [gradeOptions, setGradeOptions] = useState([8, 9, 10]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [chapterOptions, setChapterOptions] = useState([]);
  const [topicOptions, setTopicOptions] = useState([]);

  // LOs & preview
  const [los, setLos] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [microplan, setMicroplan] = useState([]);

  const [loading, setLoading] = useState({ enrich: false, generate: false });
  // const busy = loading.enrich || loading.generate;
  const [busy, setBusy] = useState(false);


  // Track user edits (to avoid clobbering) and button/loading states
  const [dirty, setDirty] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [planning, setPlanning] = useState(false);


  // Normalize whatever the LLM/RAG returns to plain strings for <input value="...">
  function normalizeLos(anyShape) {
    // Accept: ["a","b"], {learningObjectives:[...]}, {los:[...]}, null, undefined
    let arr = [];
    if (Array.isArray(anyShape)) arr = anyShape;
    else if (anyShape?.learningObjectives && Array.isArray(anyShape.learningObjectives)) arr = anyShape.learningObjectives;
    else if (anyShape?.los && Array.isArray(anyShape.los)) arr = anyShape.los;

    return arr
      .filter(Boolean)
      .map(x => (typeof x === 'string' ? x : (x.text ?? x.title ?? x.goal ?? '')))
      .filter(s => s && s.trim().length); // final cleanup
  }

  // PDF
  const [pdfExpanded, setPdfExpanded] = useState(true);

  /* ------------ bootstrap ------------ */
  useEffect(() => {
    (async () => {
      await ensureManifest();
      const g = await getGrades();
      setGradeOptions(g);
      const subs = await getSubjectsForGrade(grade);
      setSubjectOptions(subs);
      if (!subs.includes(subject)) setSubject(subs[0] || "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------ grade → subjects ------------ */
  useEffect(() => {
    (async () => {
      const subs = await getSubjectsForGrade(grade);
      setSubjectOptions(subs);
      if (!subs.includes(subject)) setSubject(subs[0] || "");
    })();
  }, [grade]);

  /* ------------ subject → chapters ------------ */
  useEffect(() => {
    (async () => {
      if (!subject) {
        setChapterOptions([]);
        setChapterId("");
        return;
      }
      const chs = await getChaptersForGradeSubject(grade, subject);
      setChapterOptions(chs);
      if (!chs.find(c => c.chapterId === chapterId)) {
        setChapterId(chs[0]?.chapterId || "");
      }
    })();
  }, [grade, subject]); // keep chapterId in sync with subject/grade

  /* ------------ chapter → topics + seed LOs (safe) ------------ */
  useEffect(() => {
    (async () => {
      if (!chapterId) {
        setTopicOptions([]);
        setTopic("");
        return;
      }
      const topics = await getTopicsForChapter(chapterId);
      setTopicOptions(topics);

      // pick a stable topic default
      const nextTopic = topics.includes(topic) ? topic : (topics[0] || "");
      if (nextTopic !== topic) setTopic(nextTopic);

      // seed only if LOs look default/empty
      setLos(prev => (looksUntouched(prev) ? seedLos({
        subjectLabel: subject,
        topicLabel: nextTopic
      }) : prev));
    })();
  }, [chapterId, subject]); // reseed when chapter/subject changes

  /* ------------ reseed when the user switches topic (still safe) ------------ */
  useEffect(() => {
    if (!chapterId) return;
    setLos(prev => (looksUntouched(prev) ? seedLos({
      subjectLabel: subject,
      topicLabel: topic
    }) : prev));
  }, [topic]); // do not clobber custom edits

  /* ------------ keep microplan live while preview is open ------------ */
  useEffect(() => {
    if (!previewOpen) return;
    setMicroplan(skeletonFromLOs(los.filter(Boolean), topic));
  }, [previewOpen, los, topic]);

  /* ------------ pdf url ------------ */
  const pdfUrl = useMemo(() => {
    if (!chapterId) return "";
    const file = chapterOptions.find(c => c.chapterId === chapterId)?.file;
    return buildLocalPdfUrl({ chapterId, file }, { page: 1 });
  }, [chapterId, chapterOptions]);

  /* ------------ LO handlers ------------ */
  const onAddLO = () => setLos(prev => [...prev, ""]);
  const onRemoveLO = i => setLos(prev => prev.filter((_, idx) => idx !== i));
  const onChangeLO = (i, val) => setLos(prev => prev.map((x, idx) => (idx === i ? val : x)));

  /* ------------ actions ------------ */

// ------------ actions (LLM first, RAG fallback) ------------

// LLM first, fall back to RAG if needed

/* ------------ actions (LLM first, RAG fallback) ------------ */

// Derive human-readable labels from current selects
const subjectLabel = subject || "";
const chapterLabel = useMemo(
  () => chapterOptions.find((c) => c.chapterId === chapterId)?.label || "",
  [chapterId, chapterOptions]
);
const topicLabel = topic || "";

// Normalize whatever the LLM/RAG returns to plain strings for <input value="...">
function normalizeLos(anyShape) {
  let arr = [];
  if (Array.isArray(anyShape)) arr = anyShape;
  else if (anyShape?.learningObjectives && Array.isArray(anyShape.learningObjectives)) arr = anyShape.learningObjectives;
  else if (anyShape?.los && Array.isArray(anyShape.los)) arr = anyShape.los;

  return arr
    .filter(Boolean)
    .map((x) => (typeof x === "string" ? x : (x.text ?? x.title ?? x.goal ?? "")))
    .filter((s) => s && s.trim().length);
}

// Single helper (remove any duplicate declaration above)
const compactLos = () => los.map((s) => String(s || "").trim()).filter(Boolean);

// LLM-first enrich, fallback to RAG if LLM throws/parses badly
const onEnrich = async () => {
  if (!chapterId) return;
  setEnriching(true);
  try {
    const payload = {
      grade,
      subject: subjectLabel,
      chapterId,
      chapterLabel,
      topicLabel,
      los: compactLos(),
      // If you later expose extracted PDF text, pass it here; for now keep empty.
      context: [],
    };

    let out;
    try {
      out = await enrichLOsLLM(payload);
    } catch (e) {
      console.warn("[LLM enrich failed, falling back to RAG]", e?.message || e);
      out = await enrichLOsRAG(payload);
    }

    setLos(normalizeLos(out));
  } finally {
    setEnriching(false);
  }
};

// LLM-first plan, fallback to RAG; always open the preview
const onGenerate = async () => {
  if (!chapterId) return;
  setPlanning(true);
  try {
    const payload = {
      grade,
      subject: subjectLabel,
      chapterId,
      chapterLabel,
      topicLabel,
      los: compactLos(),
      context: [], // add extracted PDF text later if you want stronger plans
    };

    let plan;
    try {
      plan = await generateMicroplanLLM(payload);
    } catch (e) {
      console.warn("[LLM plan failed, falling back to RAG]", e?.message || e);
      plan = await generateMicroplanRAG(payload);
    }

    // Normalize possible shapes: array of blocks, {blocks}, or {steps}
    const blocks =
      Array.isArray(plan) ? plan :
      plan?.blocks ? plan.blocks :
      plan?.steps
        ? plan.steps.map(s => ({
            title: s.title || s.type || "Step",
            body:  s.body  || s.detail || s.text || "",
            minutes: s.minutes,
          }))
        : [];

    setMicroplan(
      blocks.length ? blocks : skeletonFromLOs(compactLos(), topic) // last-resort fallback
    );
    setPreviewOpen(true);
  } finally {
    setPlanning(false);
  }
};

  /* ------------ render ------------ */
  return (
    <Card title="Teacher · Lesson Planner">
      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <div className="label">Class</div>
          <select className="input" value={grade} onChange={e => setGrade(Number(e.target.value))}>
            {gradeOptions.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="label">Subject</div>
          <select className="input" value={subject} onChange={e => setSubject(e.target.value)}>
            {subjectOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="label">Chapter</div>
          <select className="input" value={chapterId} onChange={e => setChapterId(e.target.value)}>
            {chapterOptions.map(c => (
              <option key={c.chapterId} value={c.chapterId}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="label">Topic (optional)</div>
          <select className="input" value={topic || ""} onChange={e => setTopic(e.target.value)}>
            {topicOptions.length
              ? topicOptions.map(t => <option key={t} value={t}>{t}</option>)
              : <option value="">(none)</option>}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <div className="section-title">Learning Objectives (LOs)</div>
        <div className="space-y-2">
          {los.map((text, i) => (
            <div key={`${i}-${text.slice(0, 8)}`} className="flex gap-2">
              <input
                className="input flex-1"
                value={typeof text === "string" ? text : (text?.text ?? text?.title ?? text?.goal ?? "")}
                placeholder={`LO #${i + 1}`}
                onChange={e => onChangeLO(i, e.target.value)}
              />

              <Button variant="danger" onClick={() => onRemoveLO(i)}>Remove</Button>
            </div>
          ))}
          <div><Button variant="ghost" onClick={onAddLO}>+ Add LO</Button></div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button onClick={onEnrich} disabled={enriching || planning || !chapterId}>
            {enriching ? "Enriching…" : "Enrich with AI"}
          </Button>
          <Button variant="secondary" onClick={onGenerate} disabled={enriching || planning || !chapterId}>
            {planning ? "Generating…" : "Generate Microplan"}
          </Button>
        </div>
       </div> {/* closes the <div className="mt-4"> LO wrapper */}

      {previewOpen && (
        <div className="mt-4 card">
          <div className="card-header">
            <div className="title">Microplan Preview</div>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Close</Button>
          </div>
          <div className="card-body space-y-3">
            {microplan.map((b, idx) => (
              <div key={idx} className="card muted">
                <div className="title-sm">{b.title}</div>
                <div className="mt-1">{b.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <PDFPreview
          chapterId={chapterId}
          url={pdfUrl}
          expanded={pdfExpanded}
          onToggle={() => setPdfExpanded(v => !v)}
        />
      </div>
    </Card>
  );
}

