// src/pages/students/Today.jsx
import React, { useEffect, useMemo, useState } from "react";
import Card from "../../ui/Card.jsx";
import Button from "../../ui/Button.jsx";
import { useScope } from "../../context/ScopeProvider.jsx";
import { getLatest } from "../../services/lessonStore";
import { ensureTodayFor, saveToday, mutateSection, listStudentToday, getPlanById } from "../../state/today.js";
import { getSubmission } from "../../state/submissions.js";
import StatusPill from "../../components/student/StatusPill.jsx";
import SubmissionBox from "../../components/student/SubmissionBox.jsx";

/* util */
const slug = (s) => (s || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || `sec-${Math.random().toString(36).slice(2, 8)}`;

function toCompatPlan(plan) {
  if (!plan) return null;
  let blocks = Array.isArray(plan.blocks) ? plan.blocks : [];
  if (!blocks.length && plan.handout?.sections?.length) {
    blocks = plan.handout.sections.map((s, i) => ({
      id: s.id || slug(`${i + 1}-${s.title}`),
      title: s.title || `Section ${i + 1}`,
      body: s.instructions || "",
      studentFacing: true,
      selected: true,
      citations: s.citation ? [s.citation] : undefined,
    }));
  }
  if (!blocks.length && Array.isArray(plan.microplan) && plan.microplan.length) {
    blocks = plan.microplan.map((b, i) => ({
      id: b.id || slug(`${i + 1}-${b.title}`),
      title: b.title || `Step ${i + 1}`,
      body: b.body || "",
      studentFacing: b.studentFacing !== false,
      selected: b.selected !== false,
      citations: b.citations,
    }));
  }
  return {
    id: String(plan.id || plan.planId),
    classId: plan.classId || "Class 8",
    subjectId: plan.subjectId || plan.subject || "English",
    chapterId: plan.chapterId,
    topic: plan.topic,
    mode: plan.mode || "Grounded",
    blocks,
    publishedAt: plan.publishedAt,
    handout: plan.handout,
    chapterLabel: plan.chapterLabel,
    subject: plan.subject,
  };
}
function PlanBlockBody({ plan, sectionId }) {
  const block = (plan?.blocks || []).find((b) => b.id === sectionId);
  if (!block || !(block.selected && block.studentFacing)) return null;
  return <div className="mt-1">{block.body}</div>;
}
function SubStateChip({ state }) {
  if (!state) return null;
  const cfg = {
    submitted: { bd:"#f59e0b", fg:"#b45309", label:"Pending review" },
    returned:  { bd:"#ef4444", fg:"#991b1b", label:"Returned" },
    accepted:  { bd:"#10b981", fg:"#065f46", label:"Accepted" },
    draft:     { bd:"#9ca3af", fg:"#6b7280", label:"Draft" },
  }[state];
  if (!cfg) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full"
          style={{ padding:"1px 6px", fontSize:10, lineHeight:"12px", border:`1px solid ${cfg.bd}`, color:cfg.fg }}>
      {cfg.label}
    </span>
  );
}

export default function Today() {
  const { scope } = useScope();
  const studentId = scope?.studentId || "S-001";
  const classLabel = scope?.classLabel || (scope?.classId ? `Class ${scope.classId}` : "Class 8");
  const subjectLabel = scope?.subjectLabel || scope?.subject || "English";

  // Assigned plans for this student (recent few days)
  const [assigned, setAssigned] = useState([]); // [{today, plan}]
  const [chosenPlanId, setChosenPlanId] = useState(null);

  useEffect(() => {
    const items = listStudentToday(studentId, { sinceDays: 5, withPlans: true });
    setAssigned(items);
    if (items[0]?.plan?.id) setChosenPlanId(items[0].plan.id);
  }, [studentId]);

  // Prefer an explicitly assigned plan for this class/subject; else fallback to latest
  const assignedChoice = useMemo(() => {
    const exact = assigned.find(x => (x.plan?.classId === classLabel) && (x.plan?.subjectId === subjectLabel));
    return exact || assigned[0] || null;
  }, [assigned, classLabel, subjectLabel]);

  const chosenPlanRaw =
    (chosenPlanId && getPlanById(chosenPlanId)) ||
    (assignedChoice?.plan) ||
    getLatest({ grade: classLabel, subject: subjectLabel }) ||
    getLatest();

  const plan = useMemo(() => toCompatPlan(chosenPlanRaw), [chosenPlanRaw]);

  const [today, setToday] = useState(null);
  const [busy, setBusy] = useState({});
  const [noteDrafts, setNoteDrafts] = useState({});
  const [view, setView] = useState("active"); // active | all | done
  const [openIds, setOpenIds] = useState(new Set());
  const [subStatus, setSubStatus] = useState({}); // {secId:{status,feedback?}}

  useEffect(() => {
    if (!studentId || !plan) return;
    const t = ensureTodayFor(studentId, plan);
    setToday(structuredClone(t));
  }, [studentId, plan?.id]);

  const sections = useMemo(() => today?.sections || [], [today]);

  useEffect(() => {
    if (!sections.length) return;
    const firstActive = sections.find((s) => s.status !== "done");
    setOpenIds(new Set([firstActive?.id || sections[0]?.id].filter(Boolean)));
  }, [plan?.id, sections.length]);

  // poll submission status -> drives Active/Done
  useEffect(() => {
    if (!plan || !studentId) return;
    const tick = () => {
      const map = {};
      for (const s of sections) {
        const sub = getSubmission(studentId, plan.id, s.id);
        if (sub?.status) map[s.id] = { status: sub.status, feedback: sub.teacherFeedback };
      }
      setSubStatus(map);
    };
    tick();
    const t = setInterval(tick, 1200);
    return () => clearInterval(t);
  }, [studentId, plan?.id, sections]);

  const isActive = (sec) => {
    const sub = subStatus[sec.id]?.status;
    if (sub) return sub !== "accepted";
    return sec.status !== "done";
  };
  const isDone = (sec) => {
    const sub = subStatus[sec.id]?.status;
    if (sub) return sub === "accepted";
    return sec.status === "done";
  };

  const visibleSections = useMemo(() => {
    if (view === "done") return sections.filter(isDone);
    if (view === "active") return sections.filter(isActive);
    return sections;
  }, [sections, view, subStatus]);

  const setBusyFor = (id, v) => setBusy((p) => ({ ...p, [id]: v }));
  const onNoteChange = (sectionId, val) => setNoteDrafts((p) => ({ ...p, [sectionId]: val }));
  const toggleOpen = (id) => setOpenIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const expandAll = () => setOpenIds(new Set(sections.map((s) => s.id)));
  const collapseAll = () => setOpenIds(new Set());

  function updateLocal(sectionId, fn) {
    setToday((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const s = next.sections.find((x) => x.id === sectionId);
      if (!s) return prev;
      fn(s);
      saveToday(studentId, next);
      return next;
    });
  }
  async function markStart(sectionId) { setBusyFor(sectionId, true); try { updateLocal(sectionId, (s) => (s.status = "in_progress")); mutateSection(studentId, undefined, sectionId, "in_progress"); } finally { setBusyFor(sectionId, false); } }
  async function markDone(sectionId)  { setBusyFor(sectionId, true); try { const note = (noteDrafts[sectionId] ?? "").trim() || undefined; updateLocal(sectionId, (s) => { s.status = "done"; if (note) s.note = note; else delete s.note; }); mutateSection(studentId, undefined, sectionId, "done", note);} finally { setBusyFor(sectionId, false);} }
  async function reopen(sectionId)    { setBusyFor(sectionId, true); try { updateLocal(sectionId, (s) => { s.status = "todo"; delete s.note; }); mutateSection(studentId, undefined, sectionId, "todo"); setNoteDrafts((p) => ({ ...p, [sectionId]: "" }));} finally { setBusyFor(sectionId, false);} }

  if (!plan) {
    return (
      <Card title="Today">
        <div className="muted">No assignments yet for {classLabel} · {subjectLabel}.</div>
      </Card>
    );
  }
  if (!today) {
    return (
      <Card title="Today">
        <div className="muted">Loading…</div>
      </Card>
    );
  }

  const h = plan.handout;

  return (
    <Card title={`Today · ${plan.chapterLabel || h?.title || "Lesson"}`}>
      <div className="text-xs opacity-70 mb-2">{plan.classId} · {plan.subjectId}</div>

      {/* Assignments chooser (ensures nothing is missed) */}
      {assigned.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs opacity-70">Assignments:</span>
          <select
            className="text-xs rounded border border-slate-700 bg-slate-900 px-2 py-1"
            value={chosenPlanId || (assigned[0]?.plan?.id ?? "")}
            onChange={(e) => setChosenPlanId(e.target.value)}
          >
            {assigned.map(({ today: t, plan: p }) => (
              <option key={p.id} value={p.id}>
                {new Date(t.date).toLocaleDateString()} · {p.subjectId} · {p.chapterLabel || "Lesson"}
              </option>
            ))}
          </select>
        </div>
      )}

      {h?.intro && <div className="muted">{h.intro}</div>}
      {h?.materials?.length ? <div className="mt-2"><b>Materials:</b> {h.materials.join(", ")}</div> : null}

      {/* Filter + Expand/Collapse */}
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="opacity-70">Show:</span>
        <Button size="sm" variant={view === "active" ? "secondary" : "ghost"} onClick={() => setView("active")}>Active</Button>
        <Button size="sm" variant={view === "all" ? "secondary" : "ghost"} onClick={() => setView("all")}>All</Button>
        <Button size="sm" variant={view === "done" ? "secondary" : "ghost"} onClick={() => setView("done")}>Done</Button>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={expandAll}>Expand all</Button>
          <Button size="sm" variant="ghost" onClick={collapseAll}>Collapse all</Button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {visibleSections.map((sec, idx) => {
          const open = openIds.has(sec.id);
          const subState = subStatus[sec.id]?.status;
          return (
            <div key={sec.id} className="card muted">
              <div className="flex items-center justify-between">
                <button className="title-sm text-left" onClick={() => toggleOpen(sec.id)}>
                  {open ? "▾" : "▸"} {idx + 1}. {sec.title}
                </button>
                <div className="flex items-center">
                  <StatusPill status={sec.status} />
                  <SubStateChip state={subState} />
                </div>
              </div>

              {open && (
                <>
                  <PlanBlockBody plan={plan} sectionId={sec.id} />

                  {sec.status !== "todo" && (
                    <div className="mt-2">
                      <label htmlFor={`note-${sec.id}`} className="text-xs opacity-70 block mb-1">
                        Optional note (what you did / any doubts)
                      </label>
                      <textarea
                        id={`note-${sec.id}`}
                        rows={3}
                        className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm"
                        value={noteDrafts[sec.id] ?? sec.note ?? ""}
                        onChange={(e) => onNoteChange(sec.id, e.target.value)}
                        placeholder="Add a quick note…"
                      />
                    </div>
                  )}

                  <div className="mt-2 flex gap-2 flex-wrap">
                    {sec.status === "todo" && <Button onClick={() => markStart(sec.id)} disabled={!!busy[sec.id]}>▶︎ Start</Button>}
                    {sec.status === "in_progress" && (
                      <>
                        <Button onClick={() => markDone(sec.id)} disabled={!!busy[sec.id]}>✓ Done</Button>
                        <Button variant="secondary" onClick={() => reopen(sec.id)} disabled={!!busy[sec.id]}>↺ Reopen</Button>
                      </>
                    )}
                    {sec.status === "done" && (
                      <>
                        <Button onClick={() => markDone(sec.id)} disabled={!!busy[sec.id]}>✓ Update note</Button>
                        <Button variant="secondary" onClick={() => reopen(sec.id)} disabled={!!busy[sec.id]}>↺ Reopen</Button>
                      </>
                    )}
                  </div>

                  <SubmissionBox
                    studentId={studentId}
                    plan={plan}
                    section={sec}
                    onSubmitted={() => {
                      // collapse after submit
                      setOpenIds(prev => { const next = new Set(prev); next.delete(sec.id); return next; });
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
        {!visibleSections.length && <div className="muted">Nothing to show.</div>}
      </div>
    </Card>
  );
}

