// src/pages/teachers/LessonPlanning.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../../ui/Card.jsx";
import Button from "../../ui/Button.jsx";
import { useScope } from "../../context/ScopeProvider.jsx";
import { publishPlanToToday } from "../../state/today.js";
import PDFPreview from "../../components/PDFPreview.jsx";

import {
  ensureManifest,
  getGrades,
  getSubjectsForGrade,
  getChaptersForGradeSubject,
  getTopicsForChapter,
  getChapterById,
  buildLocalPdfUrl,
} from "../../services/manifest.js";

import {
  enrichLOs as enrichLOsRAG,
  generateMicroplan as generateMicroplanRAG,
} from "../../services/rag.js";

import {
  enrichLOsLLM,
  generateMicroplanLLM,
  finalizePlanLLM,
} from "../../services/llmClient.js";

import { savePlan, postFeed, getLatest } from "../../services/lessonStore.js";

// Teacher-facing inbox & review
import SubmissionsInbox from "../../components/teacher/SubmissionsInbox.jsx";
import SubmissionReviewPanel from "../../components/teacher/SubmissionReviewPanel.jsx";

/* ------------------------------ helpers ------------------------------ */

const readList = (x) => {
  if (Array.isArray(x)) return x;
  if (!x) return [];
  if (typeof x[Symbol.iterator] === "function" && typeof x !== "string") return [...x];
  if (typeof x === "object") return Object.values(x);
  return [];
};

const toGradeOption = (g) => {
  if (g && typeof g === "object") {
    const value = g.value ?? g.id ?? String(g.label ?? "").match(/\d+/)?.[0] ?? String(g.label ?? g);
    const label = g.label ?? `Class ${value}`;
    return { value: String(value), label: String(label) };
  }
  const str = String(g);
  const value = str.match(/\d+/)?.[0] ?? str;
  const label = /^class\s*\d+/i.test(str) ? str : `Class ${value}`;
  return { value: String(value), label: String(label) };
};

const toSubject = (s) => (typeof s === "object" ? s.label ?? s.name ?? String(s) : String(s));

function toChapterOption(c, i = 0) {
  if (!c) return null;
  if (typeof c === "string") {
    return { chapterId: `ch_${i}_${c.toLowerCase().replace(/\s+/g, "-")}`, chapterLabel: c };
  }
  const id = c.chapterId ?? c.chapter_id ?? c.id ?? c.code ?? c.slug ?? null;
  const label = c.chapterLabel ?? c.label ?? c.title ?? c.name ?? (id ? `Chapter ${id}` : null);
  if (!id && !label) return null;
  return { chapterId: id || `ch_${i}`, chapterLabel: label || `Chapter ${i + 1}` };
}

function asLoObj(item, i) {
  if (item && typeof item === "object" && "text" in item) {
    return {
      id: item.id || `lo_${i}`,
      text: item.text || "",
      selected: item.selected !== false,
      origin: item.origin || "seed",
      bloom: item.bloom,
      confidence: item.confidence,
      citations: Array.isArray(item.citations) ? item.citations : [],
    };
  }
  return { id: `lo_${i}`, text: String(item || ""), selected: true, origin: "seed", citations: [] };
}

function looksUntouched(los) {
  if (!Array.isArray(los) || los.length === 0) return true;
  const texts = los.map((x) => (typeof x === "string" ? x : x?.text || "")).map((s) => s.trim().toLowerCase());
  const joined = texts.join("|");
  const stems = ["explain the key", "identify", "solve", "summarize", "analyze", "interpret"];
  const hits = stems.filter((k) => joined.includes(k)).length;
  return hits >= Math.min(2, los.length);
}

function seedLos({ subjectLabel, topicLabel }) {
  const t = topicLabel ? ` in "${topicLabel}"` : "";
  if (/english|ela|language/i.test(subjectLabel)) {
    return [
      "Identify and analyze the main idea(s) in the text.",
      "Determine supporting details that develop the main idea(s).",
      "Analyze how the author's tone supports overall meaning.",
      "Use textual evidence to support analysis and interpretation.",
    ];
  }
  if (/science/i.test(subjectLabel)) {
    return [
      `Explain the key concept(s)${t}.`,
      "Describe an everyday example for the concept.",
      "Run a quick check for understanding with a short question.",
      "Summarize observations in 2–3 sentences.",
    ];
  }
  if (/social|history|civics/i.test(subjectLabel)) {
    return [
      `Explain the key idea(s)${t}.`,
      "Connect the concept to historical/civic context and examples.",
      "Interpret a map/table/graph relevant to the chapter.",
      "Summarize the main points from the section.",
    ];
  }
  return [
    `Explain the key concept(s)${t}.`,
    "Identify real-life examples of the concept.",
    "Solve a numerical/example related to the concept.",
    "Summarize the main points from the section.",
  ];
}

function skeletonFromLOs(los, topic) {
  return [
    { title: "Starter / Hook", body: `Quick hook using ${topic ? `"${topic}"` : "a chapter cue"}.`, origin: "RAG", studentFacing: true },
    { title: "Teach / Model", body: "Explain the core idea with one worked example.", origin: "RAG", studentFacing: false },
    { title: "Practice", body: "3–5 targeted problems with immediate feedback.", origin: "RAG", studentFacing: true },
    { title: "Assess / Exit Ticket", body: "1-minute exit ticket: one multiple-choice or short-answer question.", origin: "RAG", studentFacing: true },
  ];
}

function normalizeBlocks(plan, origin = "LLM") {
  const arr = Array.isArray(plan)
    ? plan
    : plan?.blocks
    ? plan.blocks
    : plan?.steps
    ? plan.steps.map((s) => ({
        id: s.id,
        title: s.title || s.type || "Step",
        body: s.body || s.detail || s.text || "",
        minutes: s.minutes,
        studentFacing: s.studentFacing,
        citations: s.citations,
      }))
    : [];

  return (arr || []).map((b, i) => {
    const title = b.title || b.type || "Step";
    const studentFacing =
      typeof b.studentFacing === "boolean"
        ? b.studentFacing
        : /starter|hook|practice|guided|assessment|exit/i.test(String(title));
    return {
      id: b.id || `${origin.toLowerCase()}_${Date.now()}_${i}`,
      title,
      body: b.body || b.detail || b.text || "",
      studentFacing,
      origin: b.origin || origin,
      citations: Array.isArray(b.citations) ? b.citations : [],
      selected: b.selected ?? true,
    };
  });
}

function compatPlanId(raw, { subjectLabel, chapterId }) {
  const pid =
    raw?.id ||
    raw?.planId ||
    raw?.uuid ||
    raw?._id ||
    `${(raw?.subjectId || raw?.subject || subjectLabel || "subject")}:${raw?.chapterId || chapterId || raw?.chapterLabel || "lesson"}`;
  return String(pid);
}

/* ------------------------------ component ------------------------------ */

export default function LessonPlanning() {
  const { scope } = useScope();

  const [ready, setReady] = useState(false);

  // selectors
  const [grade, setGrade] = useState("8");
  const [gradeOptions, setGradeOptions] = useState([]);
  const [subject, setSubject] = useState("");
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [chapterId, setChapterId] = useState("");
  const [chapterOptions, setChapterOptions] = useState([]);
  const [topic, setTopic] = useState("");
  const [topicOptions, setTopicOptions] = useState([]);

  // mode + tabs
  const [mode, setMode] = useState("Balanced"); // Grounded | Balanced | Creative
  const [tab, setTab] = useState("plan"); // plan | handout | pdf | inbox | responses

  // LOs + plan
  const [los, setLos] = useState([]);
  const [microplan, setMicroplan] = useState([]);
  const [handout, setHandout] = useState(null);

  // ui
  const [enriching, setEnriching] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [pdfExpanded, setPdfExpanded] = useState(true);

  // drill-in preselect (from hash query params)
  const [preselect, setPreselect] = useState(null);

  /* ------------ parse hash for drill-in once ------------ */
  useEffect(() => {
    function parseOnce() {
      const h = window.location.hash || "";
      const qi = h.indexOf("?");
      if (qi < 0) return;
      const q = new URLSearchParams(h.slice(qi + 1));
      const wanted = {
        tab: q.get("tab") || undefined,
        grade: (q.get("classId") || "").match(/\d+/)?.[0], // supports "Class 8"
        subject: q.get("subjectId") || undefined,
        chapterId: q.get("chapterId") || undefined,
        planId: q.get("planId") || undefined,
      };
      setPreselect(wanted);
    }
    parseOnce();
    const onChange = () => parseOnce();
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  /* ------------ hydration chain ------------ */
  useEffect(() => {
    (async () => {
      await ensureManifest();
      const raw = await getGrades();
      let list = readList(raw).map(toGradeOption).filter((o) => o.value);
      if (!list.length) list = ["8", "9", "10"].map((v) => ({ value: String(v), label: `Class ${v}` }));
      setGradeOptions(list);

      // respect preselect if possible
      if (preselect?.grade && list.some((o) => o.value === preselect.grade)) {
        setGrade(preselect.grade);
      } else if (!list.some((o) => o.value === grade) && list.length) {
        setGrade(list[0].value);
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect?.grade]);

  useEffect(() => {
    (async () => {
      if (!ready || !grade) return;
      const subsRaw = await getSubjectsForGrade(grade);
      const subs = readList(subsRaw).map(toSubject).filter(Boolean);
      setSubjectOptions(subs);

      if (preselect?.subject && subs.includes(preselect.subject)) {
        setSubject(preselect.subject);
      } else if (!subs.includes(subject)) {
        setSubject(subs[0] || "");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, grade, preselect?.subject]);

  useEffect(() => {
    (async () => {
      if (!grade || !subject) {
        setChapterOptions([]);
        setChapterId("");
        return;
      }
      const chsRaw = await getChaptersForGradeSubject(grade, subject);
      const chs = readList(chsRaw).map((c, i) => toChapterOption(c, i)).filter(Boolean);
      setChapterOptions(chs);

      if (preselect?.chapterId && chs.some((c) => c.chapterId === preselect.chapterId)) {
        setChapterId(preselect.chapterId);
      } else if (!chs.find((c) => c.chapterId === chapterId)) {
        setChapterId(chs[0]?.chapterId || "");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, subject, preselect?.chapterId]);

  useEffect(() => {
    (async () => {
      if (!chapterId) {
        setTopicOptions([]);
        setTopic("");
        return;
      }
      const topicsRaw = await getTopicsForChapter(chapterId);
      const topics = readList(topicsRaw).map(String);
      setTopicOptions(topics);
      const nextTopic = topics.includes(topic) ? topic : topics[0] || "";
      if (nextTopic !== topic) setTopic(nextTopic);

      setLos((prev) => {
        if (looksUntouched(prev)) {
          const seeded = seedLos({ subjectLabel: subject, topicLabel: nextTopic });
          return seeded.map((s, i) => asLoObj(s, i));
        }
        return prev.map((x, i) => asLoObj(x, i));
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, subject]);

  // apply tab after the selectors are settled
  useEffect(() => {
    if (preselect?.tab === "responses") setTab("responses");
  }, [preselect?.tab]);

  /* ------------ derived ------------ */

  const gradeLabel = useMemo(() => {
    const list = readList(gradeOptions).map(toGradeOption);
    return list.find((o) => o.value === grade)?.label || (grade ? `Class ${grade}` : "");
  }, [grade, gradeOptions]);

  const chapterLabel = useMemo(() => {
    const chLocal = chapterOptions.find((c) => c.chapterId === chapterId);
    if (chLocal?.chapterLabel) return chLocal.chapterLabel;
    const ch = getChapterById(chapterId);
    return ch?.chapterLabel || "";
  }, [chapterId, chapterOptions]);

  const pdfUrl = useMemo(() => (chapterId ? buildLocalPdfUrl(chapterId) : ""), [chapterId]);

  const selectedLosOnly = useMemo(
    () =>
      (los || [])
        .map((x, i) => asLoObj(x, i))
        .filter((x) => x.selected !== false)
        .map((x) => x.text.trim())
        .filter(Boolean),
    [los]
  );

  const subjectLabel = subject;

  /* ------------ actions ------------ */

  function onToggleLO(idx) {
    setLos((prev) =>
      prev.map((x, i) =>
        i === idx ? { ...asLoObj(x, i), selected: !(asLoObj(x, i).selected ?? true) } : asLoObj(x, i)
      )
    );
  }

  function onChangeLO(idx, text) {
    setLos((prev) => prev.map((x, i) => (i === idx ? { ...asLoObj(x, i), text } : asLoObj(x, i))));
  }

  function onRemoveLO(idx) {
    setLos((prev) => prev.filter((_, i) => i !== idx).map((x, i) => asLoObj(x, i)));
  }

  function onAddLO() {
    setLos((prev) => [...prev.map((x, i) => asLoObj(x, i)), asLoObj("", prev.length)]);
  }

  async function onEnrich() {
    if (!chapterId) return;
    setEnriching(true);
    try {
      const payload = { chapterId, los: selectedLosOnly, topicLabel: topic, mode };
      let improved = [];
      try {
        improved = await enrichLOsLLM(payload);
      } catch (e) {
        improved = await enrichLOsRAG({ chapterId, los: selectedLosOnly, topicLabel: topic });
      }
      if (!Array.isArray(improved) || !improved.length) return;
      setLos((prev) => {
        const out = prev.map((x, i) => asLoObj(x, i));
        let k = 0;
        for (let i = 0; i < out.length && k < improved.length; i++) {
          if (out[i].selected !== false) {
            out[i] = { ...out[i], text: String(improved[k] || "").trim(), origin: "LLM" };
            k++;
          }
        }
        for (; k < improved.length; k++) out.push(asLoObj(String(improved[k] || ""), out.length));
        return out;
      });
    } finally {
      setEnriching(false);
    }
  }

  async function onGenerate() {
    if (!chapterId) return;
    setPlanning(true);
    const payload = {
      grade,
      subject: subjectLabel,
      chapterId,
      chapterLabel,
      topicLabel: topic,
      los: selectedLosOnly,
      context: [],
      mode,
    };
    try {
      let plan;
      if (mode === "Grounded") {
        plan = await generateMicroplanRAG(payload);
      } else if (mode === "Creative") {
        plan = await generateMicroplanLLM(payload);
      } else {
        try {
          plan = await generateMicroplanLLM(payload);
        } catch {
          plan = await generateMicroplanRAG(payload);
        }
      }
      const origin = mode === "Grounded" ? "RAG" : "LLM";
      const blocks = normalizeBlocks(plan, origin);
      const finalBlocks = blocks.length ? blocks : normalizeBlocks(skeletonFromLOs(selectedLosOnly, topic), "RAG");
      setMicroplan(finalBlocks);
      setTab("plan");

      savePlan({
        grade: gradeLabel,
        subject: subjectLabel || "",
        chapterId,
        chapterLabel,
        topicLabel: topic,
        los: selectedLosOnly,
        microplan: finalBlocks,
        mode,
      });
    } catch (e) {
      console.error("generate failed:", e);
      alert("Could not generate microplan.");
    } finally {
      setPlanning(false);
    }
  }

  async function onCraftHandout() {
    if (!microplan?.length) {
      alert("Generate a microplan first.");
      return;
    }
    setPlanning(true);
    try {
      const payload = {
        grade: gradeLabel,
        subject: subjectLabel || "",
        chapterLabel,
        topicLabel: topic,
        los: selectedLosOnly,
        microplan,
        mode,
      };
      let out = null;
      if (mode === "Grounded") {
        try {
          const mod = await import("../../services/rag.js");
          out = mod.finalizePlan ? await mod.finalizePlan(payload) : null;
        } catch {}
        if (!out) {
          out = {
            title: `Lesson Handout: ${topic || chapterLabel || "Lesson"}`,
            intro: selectedLosOnly.length ? `We will work toward: ${selectedLosOnly[0]}.` : "",
            materials: ["Notebook", "Pen/Pencil", "Reader/Text"],
            sections: microplan
              .filter((b) => b.selected !== false && b.studentFacing !== false)
              .map((b) => ({
                title: b.title,
                instructions: b.body,
                expectedOutcome: "You can explain or demonstrate the idea with a short example.",
              })),
            exitTicket: { prompt: "In 2–3 sentences, explain today’s main idea." },
          };
        }
      } else {
        try {
          out = await finalizePlanLLM(payload);
        } catch {}
        if (!out && mode === "Balanced") {
          try {
            const mod = await import("../../services/rag.js");
            out = mod.finalizePlan ? await mod.finalizePlan(payload) : null;
          } catch {}
        }
      }
      if (!out) throw new Error("No handout");
      setHandout(out);
      setTab("handout");

      savePlan({
        grade: gradeLabel,
        subject: subjectLabel || "",
        chapterId,
        chapterLabel,
        topicLabel: topic,
        los: selectedLosOnly,
        microplan,
        handout: out,
        mode,
      });
      try {
        postFeed({
          grade: gradeLabel,
          subject: subjectLabel || "",
          chapterId,
          post: { title: `New handout: ${out?.title || chapterLabel}`, summary: out?.intro || "", type: "handout" },
        });
      } catch {}
    } catch (e) {
      console.error("handout failed:", e);
      alert("Could not craft student handout.");
    } finally {
      setPlanning(false);
    }
  }

  function downloadHandoutAsHTML(h) {
    const html = `
<!doctype html><meta charset="utf-8"/><title>${h.title || "handout"}</title>
<h1>${h.title || ""}</h1>
<p>${h.intro || ""}</p>
${h.materials?.length ? `<p><b>Materials:</b> ${h.materials.join(", ")}</p>` : ""}
${(h.sections || [])
  .map((s) => `<h3>${s.title}</h3><p>${s.instructions}</p><p><i>Outcome:</i> ${s.expectedOutcome || ""}</p>`)
  .join("")}
${h.exitTicket ? `<p><b>Exit Ticket:</b> ${h.exitTicket.prompt}</p>` : ""}`.trim();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(h.title || "handout").toLowerCase().replace(/\s+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ------------------------------ derived for Responses tab ------------------------------ */

  const rawPlan = useMemo(() => {
    // Prefer explicit preselected plan (if id matches a saved record), else latest for the cohort
    const fromCohort = getLatest({ grade: gradeLabel, subject: subjectLabel, chapterId });
    return fromCohort || getLatest();
  }, [gradeLabel, subjectLabel, chapterId]);

  const planId = useMemo(
    () => (rawPlan ? compatPlanId(rawPlan, { subjectLabel, chapterId }) : null),
    [rawPlan, subjectLabel, chapterId]
  );

  /* ------------------------------ Assign (Handout tab only) ------------------------------ */

  function handleAssignFromHandout() {
    const studentId = scope?.studentId;
    if (!studentId) {
      alert('Pick a student in “Open as…” (top bar) then click Assign.');
      return;
    }
    const nowId =
      rawPlan?.id ||
      compatPlanId(rawPlan, { subjectLabel, chapterId }) ||
      `${(subjectLabel || "Subject")}:${chapterId || "Chapter"}:${Date.now()}`;

    const plan = {
      id: String(nowId),
      classId: gradeLabel,
      subjectId: subjectLabel,
      chapterId,
      topic: topic || undefined,
      mode,
      los: selectedLosOnly,
      blocks: (microplan || []).map((b) => ({
        id: b.id,
        title: b.title,
        body: b.body,
        studentFacing: b.studentFacing !== false,
        selected: b.selected !== false,
        citations: Array.isArray(b.citations) ? b.citations : [],
      })),
    };

    publishPlanToToday({ plan, classId: plan.classId, studentIds: [studentId] });
    try { localStorage.setItem("sof.assign.bump", String(Date.now())); } catch {}
    alert(`Assigned to ${studentId}`);
  }

  /* ------------------------------ render ------------------------------ */

  const selectedCount = selectedLosOnly.length;
  const totalCount = los.length;

  return (
    <Card title="Lesson Planning">
      {/* selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <div className="label">Class</div>
          <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {readList(gradeOptions).length === 0 ? (
              <option>Loading…</option>
            ) : (
              readList(gradeOptions).map((g) => {
                const o = toGradeOption(g);
                return (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                );
              })
            )}
          </select>
        </div>
        <div>
          <div className="label">Subject</div>
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {readList(subjectOptions).length === 0 ? (
              <option value="">(pick class)</option>
            ) : (
              readList(subjectOptions).map((s) => {
                const name = toSubject(s);
                return (
                  <option value={name} key={name}>
                    {name}
                  </option>
                );
              })
            )}
          </select>
        </div>
        <div>
          <div className="label">Chapter</div>
          <select className="input" value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
            {readList(chapterOptions).length === 0 ? (
              <option value="">(no chapters found for this class/subject)</option>
            ) : (
              readList(chapterOptions).map((c) => (
                <option value={c.chapterId} key={c.chapterId}>
                  {c.chapterLabel}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <div className="label">Topic</div>
          <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {readList(topicOptions).length === 0 ? (
              <option value="">(pick chapter)</option>
            ) : (
              readList(topicOptions).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* LOs */}
      <div className="mt-4">
        <div className="text-lg font-semibold text-slate-200">Learning Objectives (LOs)</div>
        <div className="space-y-2 mt-2">
          {los.map((item, i) => {
            const lo = asLoObj(item, i);
            return (
              <div key={lo.id || i} className="flex gap-2 items-center">
                <input type="checkbox" checked={lo.selected !== false} onChange={() => onToggleLO(i)} />
                <input
                  className="input flex-1"
                  value={lo.text}
                  placeholder={`LO #${i + 1}`}
                  onChange={(e) => onChangeLO(i, e.target.value)}
                />
                <Button
		variant="ghost"
		className="text-slate-300 hover:text-red-400 hover:bg-red-500/10"
		onClick={() => onRemoveLO(i)}
		title="Remove LO"
		>
		Remove
		</Button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2 items-center">
          <Button onClick={onAddLO}>+ Add LO</Button>
          <Button onClick={onEnrich} disabled={enriching || planning || !chapterId}>
            {enriching ? "Enriching…" : "Enrich with AI"}
          </Button>
          <Button variant="secondary" onClick={onGenerate} disabled={planning || !chapterId}>
            {planning ? "Generating…" : "Generate Microplan"}
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="muted">Mode:</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant={mode === "Grounded" ? "primary" : "ghost"} onClick={() => setMode("Grounded")}>
                Grounded
              </Button>
              <Button size="sm" variant={mode === "Balanced" ? "primary" : "ghost"} onClick={() => setMode("Balanced")}>
                Balanced
              </Button>
              <Button size="sm" variant={mode === "Creative" ? "primary" : "ghost"} onClick={() => setMode("Creative")}>
                Creative
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-1 text-xs text-slate-400">
          Using {selectedCount}/{totalCount} LOs • Mode: {mode}
        </div>
      </div>

      {/* tabs */}
      <div className="mt-4 flex gap-2">
        <Button variant={tab === "pdf" ? "primary" : "ghost"} onClick={() => setTab("pdf")}>
          PDF
        </Button>
        <Button variant={tab === "plan" ? "primary" : "ghost"} onClick={() => setTab("plan")}>
          Plan
        </Button>
        <Button variant={tab === "handout" ? "primary" : "ghost"} onClick={() => setTab("handout")}>
          Handout
        </Button>
        <Button variant={tab === "inbox" ? "primary" : "ghost"} onClick={() => setTab("inbox")}>
          Inbox
        </Button>
        <Button variant={tab === "responses" ? "primary" : "ghost"} onClick={() => setTab("responses")}>
          Responses
        </Button>
      </div>

      {/* Microplan */}
      {tab === "plan" && !!microplan?.length && (
        <div className="mt-4">
          <div className="card">
            <div className="card-header">
              <div className="title">Microplan</div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onCraftHandout} disabled={!microplan?.length}>
                  Craft Student Handout
                </Button>
              </div>
            </div>
            <div className="card-body space-y-3">
              {microplan.map((b) => (
                <div key={b.id} className="card muted">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={b.selected !== false}
                        onChange={() =>
                          setMicroplan((prev) =>
                            prev.map((x) => (x.id === b.id ? { ...x, selected: !(x.selected ?? true) } : x))
                          )
                        }
                      />
                      <div className="title-sm">{b.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={b.studentFacing ? "secondary" : "ghost"}
                        onClick={() =>
                          setMicroplan((prev) =>
                            prev.map((x) => (x.id === b.id ? { ...x, studentFacing: !x.studentFacing } : x))
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

      {/* Handout */}
      {tab === "handout" && handout && (
        <div className="mt-4 card">
          <div className="card-header">
            <div className="title">{handout.title}</div>
            <div className="flex gap-2">
              {/* Assign is ONLY shown after a handout exists */}
              <Button onClick={handleAssignFromHandout}>Assign</Button>
              <Button variant="ghost" onClick={() => downloadHandoutAsHTML(handout)}>
                Download
              </Button>
            </div>
          </div>
          <div className="card-body space-y-3">
            <div className="muted">{handout.intro}</div>
            {handout.materials?.length ? (
              <div>
                <b>Materials:</b> {handout.materials.join(", ")}
              </div>
            ) : null}
            {(handout.sections || []).map((s, i) => (
              <div key={i} className="card muted">
                <div className="title-sm">{s.title}</div>
                <div className="mt-1">
                  <b>Instructions:</b> {s.instructions}
                </div>
                <div className="mt-1">
                  <b>Outcome:</b> {s.expectedOutcome}
                </div>
              </div>
            ))}
            {handout.exitTicket && (
              <div className="muted">
                <b>Exit Ticket:</b> {handout.exitTicket.prompt}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF */}
      {tab === "pdf" && (
        <div className="mt-6">
          <PDFPreview
            chapterId={chapterId}
            url={pdfUrl}
            expanded={pdfExpanded}
            onToggle={() => setPdfExpanded((v) => !v)}
          />
        </div>
      )}

      {/* Inbox */}
      {tab === "inbox" && (
        <div className="mt-4">
          <SubmissionsInbox />
        </div>
      )}

      {/* Responses */}
      {tab === "responses" && (
        <div className="mt-4">
          {!planId ? (
            <div className="text-sm text-slate-400">
              No active plan found for this Class/Subject/Chapter. Publish/Assign a plan, then check back.
            </div>
          ) : (
            <SubmissionReviewPanel planId={planId} />
          )}
        </div>
      )}
    </Card>
  );
}

