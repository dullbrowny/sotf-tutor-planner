
import React, { useMemo, useState } from "react";
import CitationLink from "../../components/CitationLink";
import { useScope } from "../../context/ScopeProvider";
import { listAssignments, markDone } from "../../state/assignments";

export default function MicroplanConsume() {
  const { scope } = useScope();
  const studentId = scope?.studentId || "S-001";
  const [filter, setFilter] = useState("active"); // active | done | all

  const assignments = useMemo(() => {
    const all = listAssignments({ studentId }) || [];
    const now = Date.now();
    return all
      .map(a => ({...a, isOverdue: a.due && new Date(a.due).getTime() < now }))
      .filter(a => filter === "all" ? true : (filter==="done" ? a.status==="done" : a.status!=="done"));
  }, [studentId, filter]);

  function handleDone(aid, itemId) {
    markDone({ assignmentId: aid, itemId });
  }

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">My Assignments</div>
          <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="active">Active</option>
            <option value="done">Completed</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {assignments.map(a => (
        <div key={a.id} className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{a.subject} · Due {new Date(a.due).toLocaleDateString()}</div>
            {a.isOverdue && <span className="text-xs text-red-300">Overdue</span>}
          </div>
          <div className="mt-2 space-y-2">
            {a.items.map(it => (
              <div key={it.id} className="card p-3">
                <div className="text-sm">{it.qno} · {it.preview}</div>
                <div className="mt-1 flex items-center justify-between">
                  {it.citation && <CitationLink refObj={it.citation} />}
                  <button className="btn-secondary" onClick={() => handleDone(a.id, it.id)}>
                    Mark done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!assignments.length && <div className="text-sm text-slate-400">No assignments yet.</div>}
    </div>
  );
}
