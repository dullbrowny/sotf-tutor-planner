import React, { useEffect, useMemo, useState } from "react";
import Card from "../../ui/Card.jsx";
import Button from "../../ui/Button.jsx";
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

import {
  enrichLOs as enrichLOsRAG,
  generateMicroplan as generateMicroplanRAG,
  finalizePlan as finalizePlanRAG,
  // findPagesForQueries // optional later
} from "../../services/rag";
import {
  enrichLOsLLM,
  generateMicroplanLLM,
  finalizePlanLLM,
} from "../../services/llmClient";

/* ===================== helpers ===================== */

function cleanLO(s) {
  return String(s || "").replace(/^\s*(?:\d{1,3}[\.\)]|[-*•])\s+/, "").trim();
}
function normalizeLos(anyShape) {
  let arr = [];
  if (Array.isArray(anyShape)) arr = anyShape;
  else if (anyShape?.learningObjectives) arr = anyShape.learningObjectives;
  else if (anyShape?.los) arr = anyShape.los;
  return (arr || [])
    .map(x => (typeof x === "string" ? x : (x?.text ?? x?.title ?? x?.goal ?? "")))
    .map(cleanLO)
    .filter(Boolean);
}
function seedLos({ subjectLabel, topicLabel }) {
  const s = (subjectLabel || "").toLowerCase();
  const t = topicLabel && topicLabel !== "(none)" ? ` in “${topicLabel}”` : "";
  if (s.includes("science")) {
    return [
      `Explain the key concept(s)${t}.`,
      "Identify real-life applications/examples of the concept.",
      "Plan/interpret a simple investigation or data table.",
      "Summarize the main points from the section.",
    ];
  }
  if (s.includes("english")) {
    return [
      `Explain the key concept(s)${t}.`,
      "Identify key ideas, literary devices, and vocabulary in context.",
      "Analyze a short passage/poem and cite text evidence.",
      "Summarize the main points from the section.",
    ];
  }
  return [
    `Explain the key concept(s)${t}.`,
    "Identify real-life examples of the concept.",
    "Solve a worked example related to the concept.",
    "Summarize the main points from the section.",
  ];
}
function looksUntouched(los) {
  if (!Array.isArray(los) || los.length === 0) return true;
  const joined = los.map(s => String(typeof s === "string" ? s : s?.text || "").toLowerCase()).join("|");
  const stems = ["explain the key", "identify", "solve", "summarize", "analyze", "interpret"];
  const hits = stems.filter(k => joined.includes(k)).length;
  return hits >= Math.min(2, los.length);
}
// normalize any plan payload into strict block shape
function normalizeBlocks(plan, origin = "LLM") {
  const arr = Array.isArray(plan)
    ? plan
    : plan?.blocks
      ? plan.blocks
      : plan?.steps
        ? plan.steps.map(s => ({
            title: s.title || s.type || "Step",
            body: s.body || s.detail || s.text || "",
            minutes: s.minutes,
          }))
        : [];
  return (arr || []).map((b, i) => ({
    id: b.id || `${origin.toLowerCase()}_${Date.now()}_${i}`,
    title: b.title || b.type || "Step",
    body: b.body || b.detail || b.text || "",
    studentFacing:
      typeof b.studentFacing === "boolean"
        ? b.studentFacing
        : /starter|hook|practice|guided|assessment|exit/i.test(String(b.title || "")),
    origin: b.origin || origin,
    citations: Array.isArray(b.citations) ? b.citations : [],
    selected: b.selected ?? true,
  }));
}

/* ===================== component ===================== */

export default function LessonPlanning() {
  // selector options
  const [gradeOptions, setGradeOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [chapterOptions, setChapterOptions] = useState([]);
  const [topicOptions, setTopicOptions] = useState([]);

  // selected values
  const [selectedGrade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topic, setTopic] = useState("");

  // LOs
  const [los, setLos] = useState([]);

  // planning mode
  const [mode, setMode] = useState("Balanced"); // "Grounded" | "Balanced" | "Creative"

  // outputs
  const [microplan, setMicroplan] = useState([]); // normalized blocks
  const [handout, setHandout] = useState(null);

  // ui state
  const [enriching, setEnriching] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState("");
  const [pdfExpanded, setPdfExpanded] = useState(true);

  /* --------- labels & pdf url --------- */
  const subjectLabel = subject || "";
  const chapterLabel = useMemo(() => {
    const hit = chapterOptions.find(c => c.chapterId === chapterId);
    return hit ? `${hit.chapterNum ? `Ch ${hit.chapterNum}: ` : ""}${hit.chapterTitle || hit.title || hit.name || ""}` : "";
  }, [chapterOptions, chapterId]);
  const topicLabel = topic || "(none)";

  const pdfUrl = useMemo(() => {
    if (!chapterId) return "";
    const file = chapterOptions.find(c => c.chapterId === chapterId)?.file;
    return file ? buildLocalPdfUrl({ chapterId, file }) : "";
  }, [chapterId, chapterOptions]);

  // chips
  const selectedCount = useMemo(
    () => los.filter(item => (typeof item === "string" ? true : item?.selected !== false)).length,
    [los]
  );
  const totalCount = los.length;

  /* --------- bootstrap --------- */
  useEffect(() => {
    (async () => {
      await ensureManifest();
      const g = await getGrades();
      setGradeOptions(g);
      if (!g.includes(selectedGrade)) setGrade(g[0] || "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------- grade → subject --------- */
  useEffect(() => {
    (async () => {
      if (!selectedGrade) { setSubjectOptions([]); return; }
      const subs = await getSubjectsForGrade(selectedGrade);
      setSubjectOptions(subs);
      if (!subs.includes(subject)) setSubject(subs[0] || "");
    })();
  }, [selectedGrade]);

  /* --------- subject → chapters --------- */
  useEffect(() => {
    (async () => {
      if (!selectedGrade || !subject) { setChapterOptions([]); return; }
      const chs = await getChaptersForGradeSubject(selectedGrade, subject);
      setChapterOptions(chs);
      if (!chs.map(c => c.chapterId).includes(chapterId)) setChapterId(chs?.[0]?.chapterId || "");
    })();
  }, [selectedGrade, subject]);

  /* --------- chapter → topics & seed LOs --------- */
  useEffect(() => {
    (async () => {
      if (!chapterId) { setTopicOptions([]); return; }
      const chapter = await getChapterById(chapterId);
      const t = await getTopicsForChapter(chapterId);
      setTopicOptions(["(none)", ...t]);

      const chapterHasKnownLOs = Array.isArray(chapter?.learningObjectives) && chapter.learningObjectives.length >= 2;
      setLos(prev => {
        if (!looksUntouched(prev)) return prev;
        const base = chapterHasKnownLOs ? normalizeLos(chapter.learningObjectives) : seedLos({ subjectLabel, topicLabel });
        return base.map((txt, i) => ({ id: `lo_${i}`, text: txt, selected: true }));
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  /* --------- LO handlers --------- */
  const onAddLO = () => setLos(prev => [...prev, { id: `lo_${Date.now()}`, text: "", selected: true }]);
  const onRemoveLO = i => setLos(prev => prev.filter((_, idx) => idx !== i));
  const onChangeLO = (i, val) => setLos(prev => prev.map((x, idx) => (idx === i ? (typeof x === "string" ? { id: `lo_${i}`, text: val, selected: true } : { ...x, text: val }) : x)));
  const onToggleLO = (i) => setLos(prev => prev.map((x, idx) => (idx === i ? (typeof x === "string" ? { id: `lo_${i}`, text: x, selected: false } : { ...x, selected: !(x.selected ?? true) }) : x)));

  const selectedLosOnly = useMemo(
    () => los
      .filter(item => (typeof item === "string" ? true : item?.selected !== false))
      .map(item => (typeof item === "string" ? item : (item?.text ?? "")))
      .map(cleanLO)
      .filter(Boolean),
    [los]
  );

  /* --------- actions --------- */

  const onEnrich = async () => {
    if (!chapterId) return;
    if (selectedLosOnly.length === 0) { setError("Select at least one LO to enrich."); return; }
    setError(""); setEnriching(true);
    try {
      const payload = {
        grade: selectedGrade,
        subject: subjectLabel,
        chapterId,
        chapterLabel,
        topicLabel,
        los: selectedLosOnly,
        mode,
      };
      let out;
      try {
        out = await enrichLOsLLM(payload);
      } catch (e) {
        console.warn("[LLM enrich failed, falling back to RAG]", e?.message || e);
        out = await enrichLOsRAG(payload);
      }
      const normalized = normalizeLos(out);
      setLos(prev => {
        const kept = prev
          .map(it => (typeof it === "string" ? { id: `lo_${Math.random()}`, text: cleanLO(it), selected: false } : { ...it, text: cleanLO(it.text) }))
          .filter(it => it.selected === false);
        const seen = new Set(kept.map(k => k.text.trim().toLowerCase()));
        const fresh = normalized
          .filter(t => {
            const key = t.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((txt, i) => ({ id: `lo_new_${Date.now()}_${i}`, text: txt, selected: true }));
        return [...kept, ...fresh];
      });
    } catch (e) {
      console.error(e);
      setError("Could not enrich LOs.");
    } finally {
      setEnriching(false);
    }
  };

  const onGenerate = async () => {
    if (!chapterId) return;
    if (selectedLosOnly.length === 0) { setError("Select at least one LO to generate a plan."); return; }
    setError(""); setPlanning(true);
    try {
      const payload = {
        grade: selectedGrade,
        subject: subjectLabel,
        chapterId,
        chapterLabel,
        topicLabel,
        los: selectedLosOnly,
        mode,
      };

      let plan;
      if (mode === "Grounded") {
        plan = await generateMicroplanRAG(payload);
      } else if (mode === "Creative") {
        plan = await generateMicroplanLLM(payload);
      } else {
        try {
          plan = await generateMicroplanLLM(payload);
        } catch (e) {
          console.warn("[LLM plan failed, falling back to RAG]", e?.message || e);
          plan = await generateMicroplanRAG(payload);
        }
      }
      const planOrigin = mode === "Grounded" ? "RAG" : "LLM";
      setMicroplan(normalizeBlocks(plan, planOrigin));
    } catch (e) {
      console.error(e);
      setError("Could not generate microplan.");
    } finally {
      setPlanning(false);
    }
  };

  async function onCraftHandout() {
    if (!microplan?.length) { setError("Generate a microplan first."); return; }
    setError(""); setPlanning(true);
    try {
      const payload = {
        grade: selectedGrade,
        subject: subjectLabel,
        chapterLabel,
        topicLabel,
        los: selectedLosOnly,
        microplan,
        mode,
      };
      const out = mode === "Grounded"
        ? await finalizePlanRAG(payload)
        : await finalizePlanLLM(payload);
      setHandout(out);
    } catch (e) {
      console.error(e);
      setError("Could not craft student handout.");
    } finally {
      setPlanning(false);
    }
  }

  function downloadHandoutAsHTML(handout) {
    if (!handout) return;
    const html = `
<!doctype html>
<meta charset="utf-8"/>
<title>${handout.title}</title>
<h1>${handout.title}</h1>
<p>${handout.intro}</p>
${handout.materials?.length ? `<p><b>Materials:</b> ${handout.materials.join(", ")}</p>` : ""}
${(handout.sections || []).map(s => `<h3>${s.title}</h3><p>${s.instructions}</p><p><i>Outcome:</i> ${s.expectedOutcome}</p>`).join("")}
${handout.exitTicket ? `<p><b>Exit Ticket:</b> ${handout.exitTicket.prompt}</p>` : ""}
`.trim();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(handout.title || "handout").toLowerCase().replace(/\s+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ===================== render ===================== */

  return (
    <Card title="Teacher · Lesson Planner">
      {/* selectors */}
      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <div className="label">Class / Grade</div>
          <select className="input" value={selectedGrade || ""} onChange={e => setGrade(e.target.value)}>
            {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div>
          <div className="label">Subject</div>
          <select className="input" value={subject || ""} onChange={e => setSubject(e.target.value)}>
            {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <div className="label">Chapter</div>
          <select className="input" value={chapterId || ""} onChange={e => setChapterId(e.target.value)}>
            {chapterOptions.map(c => (
              <option key={c.chapterId} value={c.chapterId}>
                {c.chapterNum ? `Ch ${c.chapterNum}: ` : ""}{c.chapterTitle || c.title || c.name}
              </option>
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

      {/* mode selector */}
      <div className="mt-3">
        <div className="label">Planning Mode</div>
        <div className="flex gap-2">
          <Button variant={mode === "Grounded" ? "primary" : "ghost"} onClick={() => setMode("Grounded")}>Grounded</Button>
          <Button variant={mode === "Balanced" ? "primary" : "ghost"} onClick={() => setMode("Balanced")}>Balanced</Button>
          <Button variant={mode === "Creative" ? "primary" : "ghost"} onClick={() => setMode("Creative")}>Creative</Button>
        </div>
      </div>

      {/* LOs */}
      <div className="mt-4">
        <div className="section-title">Learning Objectives (LOs)</div>
        <div className="space-y-2">
          {los.map((item, i) => {
            const text = typeof item === "string" ? item : (item?.text ?? "");
            const selected = typeof item === "string" ? true : (item?.selected !== false);
            return (
              <div key={`${i}-${String(text).slice(0, 12)}`} className="flex gap-2 items-center group">
                <input type="checkbox" checked={selected} onChange={() => onToggleLO(i)} />
                <input
                  className="input flex-1"
                  value={text}
                  placeholder={`LO #${i + 1}`}
                  onChange={e => onChangeLO(i, e.target.value)}
                />
                <Button
                  variant="danger"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  onClick={() => onRemoveLO(i)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
          <div><Button variant="ghost" onClick={onAddLO}>+ Add LO</Button></div>
        </div>

        <div className="mt-3 flex gap-2 items-center">
          <Button onClick={onEnrich} disabled={enriching || planning || !chapterId}>
            {enriching ? "Enriching…" : "Enrich with AI"}
          </Button>
          <Button variant="secondary" onClick={onGenerate} disabled={enriching || planning || !chapterId}>
            {planning ? "Generating…" : "Generate Microplan"}
          </Button>
          <span className="muted" style={{ marginLeft: 8 }}>
            Using {selectedCount}/{totalCount} LOs • Mode: {mode}
          </span>
        </div>

        {!!error && (
          <div className="muted mt-2" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>

      {/* plan + actions */}
      {!!microplan?.length && (
        <div className="mt-6">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="title">Microplan</div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onCraftHandout}>
                  Craft Student Handout
                </Button>
                <Button variant="ghost" onClick={() => downloadHandoutAsHTML(handout)} disabled={!handout}>
                  Download
                </Button>
              </div>
            </div>
            <div className="card-body space-y-3">
              {microplan.map((b, idx) => (
                <div key={b.id || idx} className="card muted">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={b.selected !== false}
                        onChange={() =>
                          setMicroplan(prev =>
                            prev.map(x => x.id === b.id ? { ...x, selected: !(x.selected ?? true) } : x)
                          )
                        }
                      />
                      <div className="title-sm">{b.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={b.studentFacing ? "secondary" : "ghost"}
                        onClick={() =>
                          setMicroplan(prev =>
                            prev.map(x => x.id === b.id ? { ...x, studentFacing: !x.studentFacing } : x)
                          )
                        }
                        title="Toggle student-facing"
                      >
                        {b.studentFacing ? "Student-facing" : "Teacher notes"}
                      </Button>
                      <span className="badge">{b.origin}</span>
                      {b.citations?.length ? <span className="badge">{b.citations.length} cites</span> : null}
                    </div>
                  </div>
                  <div className="mt-1">{b.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* handout preview */}
      {handout && (
        <div className="card mt-4">
          <div className="card-header"><div className="title">{handout.title}</div></div>
          <div className="card-body space-y-3">
            <div className="muted">{handout.intro}</div>
            {handout.materials?.length ? <div><b>Materials:</b> {handout.materials.join(", ")}</div> : null}
            {handout.sections?.map((s, i) => (
              <div key={i} className="card muted">
                <div className="title-sm">{s.title}</div>
                <div className="mt-1"><b>Instructions:</b> {s.instructions}</div>
                <div className="mt-1"><b>Outcome:</b> {s.expectedOutcome}</div>
              </div>
            ))}
            {handout.exitTicket && (
              <div className="muted"><b>Exit Ticket:</b> {handout.exitTicket.prompt}</div>
            )}
          </div>
        </div>
      )}

      {/* PDF preview */}
      <div className="mt-6">
        {!pdfUrl ? (
          <div className="card">
            <div className="card-header"><div className="title">Inline PDF Preview</div></div>
            <div className="card-body muted">No PDF found for this chapter.</div>
          </div>
        ) : (
          <PDFPreview
            chapterId={chapterId}
            url={pdfUrl}
            expanded={pdfExpanded}
            onToggle={() => setPdfExpanded(v => !v)}
          />
        )}
      </div>
    </Card>
  );
}

