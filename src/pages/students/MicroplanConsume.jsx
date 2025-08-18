// src/pages/student/MicroplanConsume.jsx
// Migrated to list *Today* entries (localStorage-only) and allow per-section status changes.
import React, { useMemo, useState } from "react";
import CitationLink from "../../components/CitationLink";
import { useScope } from "../../context/ScopeProvider";
import { mutateSection } from "../../state/today.js";

const TODAY_KEY = "sof.today.v1";

function readIndex() {
  try { return JSON.parse(localStorage.getItem(TODAY_KEY) || "{}"); }
  catch { return {}; }
}

export default function MicroplanConsume() {
  const { scope } = useScope();
  const studentId = scope?.studentId || "S-001";
  const [filter, setFilter] = useState("active"); // active | done | all

  // Pull all Today entries for this student (all dates/plans), local only.
  const entries = useMemo(() => {
    const idx = readIndex();
    const list = idx[studentId] || [];
    // derive per-entry completion
    const withMeta = list.map(t => {
      const total = t.sections?.length || 0;
      const done = t.sections?.filter(s => s.status === "done").length || 0;
      const started = t.sections?.filter(s => s.status !== "todo").length || 0;
      return { ...t, _meta: { total, done, started, completion: total ? Math.round(done * 100 / total) : 0 } };
    });
    if (filter === "all") return withMeta;
    if (filter === "done") return withMeta.filter(t => t._meta.done === t._meta.total && t._meta.total > 0);
    return withMeta.filter(t => !(t._meta.done === t._meta.total && t._meta.total > 0)); // active = not fully done
  }, [studentId, filter]);

  function setStatus(t, sectionId, status) {
    mutateSection(studentId, t.date, sectionId, status);
    // optimistic UI
    const idx = readIndex();
    const list = idx[studentId] || [];
    const i = list.findIndex(x => x.date === t.date && x.planId === t.planId);
    if (i >= 0) {
      const sec = list[i].sections.find(s => s.id === sectionId);
      if (sec) sec.status = status;
      localStorage.setItem(TODAY_KEY, JSON.stringify(idx));
    }
    // force React to recompute
    setFilter(f => f === "all" ? "all" : (f === "done" ? "active" : "active")); // small toggle to retrigger
    setTimeout(() => setFilter(f => f), 0);
  }

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">My Sections</div>
          <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="active">Active</option>
            <option value="done">Completed</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {entries.map(t => (
        <div key={`${t.date}-${t.planId}`} className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              Class {t.classId} · {t.date}
            </div>
            <div className="text-xs text-slate-400">
              {t._meta.completion}% complete ({t._meta.done}/{t._meta.total})
            </div>
          </div>

          <div className="mt-2 space-y-2">
            {t.sections.map(s => (
              <div key={s.id} className="card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">{s.title}</div>
                  {/* If you have citations on the plan block, you can thread them in by looking up the plan
                      (omitted here to keep this component storage-only per DoD). */}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {s.status === "todo" && (
                    <button className="btn-primary" onClick={() => setStatus(t, s.id, "in_progress")}>▶︎ Start</button>
                  )}
                  {s.status !== "done"
                    ? <button className="btn-primary" onClick={() => setStatus(t, s.id, "done")}>✓ Done</button>
                    : <button className="btn-secondary" onClick={() => setStatus(t, s.id, "todo")}>↺ Reopen</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!entries.length && <div className="text-sm text-slate-400">No sections yet.</div>}
    </div>
  );
}

