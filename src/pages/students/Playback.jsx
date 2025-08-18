// src/pages/student/Playback.jsx
// Migrated to play through *today.sections* (new Today/track APIs), not legacy assignments.
import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../ui/Card";
import CitationLink from "../../components/CitationLink";
import { useScope } from "../../context/ScopeProvider";
import { getLatest } from "../../services/lessonStore";
import { ensureTodayFor, mutateSection, saveToday } from "../../state/today.js";

export default function StudentPlayback({ grade = "Class 8", subject = "English", chapterId }) {
  const { scope } = useScope();
  const studentId = scope?.studentId || "S-001";

  const plan = useMemo(() => {
    return getLatest({ grade, subject, chapterId }) || getLatest();
  }, [grade, subject, chapterId]);

  const [today, setToday] = useState(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!studentId || !plan?.id) return;
    const t = ensureTodayFor(studentId, plan);
    setToday(structuredClone(t));
    setIdx(0);
  }, [studentId, plan?.id]);

  const sections = today?.sections || [];
  const sec = sections[idx];
  const total = sections.length;

  function patchLocal(fn) {
    setToday(prev => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      saveToday(studentId, next);
      return next;
    });
  }

  function prev() { if (idx > 0) setIdx(i => i - 1); }
  function next() { if (idx < total - 1) setIdx(i => i + 1); else window.location.hash = "#/students/dashboard"; }

  function startNow() {
    if (!sec) return;
    patchLocal(t => { t.sections[idx].status = "in_progress"; });
    mutateSection(studentId, undefined, sec.id, "in_progress");
  }
  function markDoneAndNext() {
    if (!sec) return;
    const note = sec.note;
    patchLocal(t => { t.sections[idx].status = "done"; });
    mutateSection(studentId, undefined, sec.id, "done", note);
    next();
  }

  if (!plan || !today || !sec) {
    return (
      <Card title="Playback">
        <div className="text-sm text-slate-400">No sections to play.</div>
      </Card>
    );
  }

  const block = (plan.blocks || []).find(b => b.id === sec.id);
  const citation = block?.citations?.[0];

  return (
    <Card title={`Playback · ${plan.subjectId || plan.subject || "Session"} · ${idx + 1}/${total}`}>
      <div className="mb-2 text-xs text-slate-400">
        Plan: <span className="font-mono">{plan.id}</span>
      </div>

      <div className="card p-4">
        <div className="text-sm font-medium">{idx + 1}. {sec.title}</div>
        <div className="mt-1 text-sm">{block?.body}</div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-slate-400 capitalize">{sec.status}</span>
          {citation && (
            <CitationLink
              refObj={{ chapterId: citation.ref, anchor: citation.page ? `p${citation.page}` : undefined, title: citation.ref }}
            />
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="btn-secondary" onClick={prev} disabled={idx === 0}>Prev</button>
          {sec.status === "todo" && <button className="btn-primary" onClick={startNow}>Start</button>}
          {sec.status !== "done"
            ? <button className="btn-primary" onClick={markDoneAndNext}>Mark Done & Next</button>
            : <button className="btn-secondary" onClick={next}>Next</button>}
          <button className="btn-secondary ml-auto" onClick={() => (window.location.hash = "#/students/dashboard")}>
            Exit
          </button>
        </div>
      </div>
    </Card>
  );
}

