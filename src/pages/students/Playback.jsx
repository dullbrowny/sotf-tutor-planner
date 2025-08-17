import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../ui/Card";
import CitationLink from "../../components/CitationLink";
import examplePlan from "../../models/planExample.json";
import { recordAttempt, getItemStatus } from "../../state/assignments";

function loadAssignmentById(id) {
  try {
    const a = JSON.parse(localStorage.getItem("sotf.assignments.v1") || "[]");
    return a.find(x => x.id === id) || null;
  } catch {
    return null;
  }
}

function toFallback() {
  const items = (examplePlan?.items || []).map((x, i) => ({
    id: x.id || `ex${i + 1}`,
    qno: x.qno || `Q${i + 1}`,
    preview: x.preview || x.text || "Practice item",
    estMinutes: x.estMinutes || 5,
    citation: x.citation || null
  }));
  return {
    id: "example",
    subject: examplePlan?.subject || "Math",
    classId: "8A",
    dueISO: new Date().toISOString(),
    items
  };
}

export default function StudentPlayback({ planId }) {
  const [assignment, setAssignment] = useState(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const found = planId ? loadAssignmentById(planId) : null;
    setAssignment(found || toFallback());
    setIdx(0);
  }, [planId]);

  const it = assignment?.items?.[idx];
  const total = assignment?.items?.length || 0;

  const itemKey = useMemo(() => (it ? (it.id || it.qno || String(idx)) : ""), [it, idx]);

  function mark(status) {
    if (!assignment || !it) return;
    recordAttempt({ assignmentId: assignment.id, itemId: itemKey, status });
    setIdx(x => x);
  }
  function next() { if (idx < total - 1) setIdx(idx + 1); else window.location.hash = "#/students/dashboard"; }
  function prev() { if (idx > 0) setIdx(idx - 1); }
  function startNow() { mark("inprogress"); }
  function markDoneAndNext() { mark("done"); next(); }

  if (!assignment || !it) {
    return (
      <Card title="Playback">
        <div className="text-sm text-slate-400">No items to play.</div>
      </Card>
    );
  }

  const status = getItemStatus(assignment.id, itemKey);
  const dueStr = (() => {
    try { const d = new Date(assignment.dueISO); return isNaN(d) ? "—" : d.toLocaleString(); } catch { return "—"; }
  })();

  return (
    <>
      <Card title={`Playback · ${assignment.subject || "Session"} · ${idx + 1}/${total}`}>
        <div className="mb-2 text-xs text-slate-400">
          Assignment: <span className="font-mono">{assignment.id}</span>
          <span className="opacity-50"> · </span>
          Due: {dueStr}
        </div>

        <div className="card p-4">
          <div className="text-sm font-medium">{it.qno} · {it.preview}</div>
          {(it?.phase) && (
            <span className="inline-block text-[10px] px-2 py-[2px] rounded-full border border-slate-600 text-slate-300 uppercase tracking-wide mt-1">
              {it.phase}
            </span>
          )}
          {it.chapterRef && (
            <div className="text-[11px] text-slate-400 mt-1">
              Chapter: <span className="font-medium">{it.chapterRef.chapterName}</span>
              {it.chapterRef.page ? <> · p.{it.chapterRef.page}</> : null}
              {it.chapterRef.url ? <> · <a className="underline" href={it.chapterRef.url} target="_blank" rel="noreferrer">source</a></> : null}
            </div>
          )}
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Est. {it.estMinutes || 5} min · <span className="capitalize">{status}</span>
            </span>
            {it?.citation && <CitationLink refObj={it.citation} />}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button className="btn-secondary" onClick={prev} disabled={idx === 0}>Prev</button>
            {status === "notstarted" && <button className="btn-primary" onClick={startNow}>Start</button>}
            {status !== "done"
              ? <button className="btn-primary" onClick={markDoneAndNext}>Mark Done & Next</button>
              : <button className="btn-secondary" onClick={next}>Next</button>}
            <button className="btn-secondary ml-auto" onClick={() => (window.location.hash = "#/students/dashboard")}>
              Exit
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}

