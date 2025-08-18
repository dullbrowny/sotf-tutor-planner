// src/components/teacher/SubmissionsInbox.jsx
import React from "react";
import Button from "../../ui/Button.jsx";
import SubmissionReviewPanel from "./SubmissionReviewPanel.jsx";

const SUB_KEY = "sof.submissions.v1";
const TODAY_KEY = "sof.today.v1";

function read(k, fb) { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); } catch { return fb; } }

export default function SubmissionsInbox() {
  const [rows, setRows] = React.useState([]);
  const [focus, setFocus] = React.useState(null); // {planId, sectionId}

  React.useEffect(() => {
    const subsIdx = read(SUB_KEY, {});
    const todayIdx = read(TODAY_KEY, {});
    const out = [];
    for (const studentId of Object.keys(subsIdx)) {
      const byPlan = subsIdx[studentId] || {};
      for (const planId of Object.keys(byPlan)) {
        const bySection = byPlan[planId] || {};
        for (const sectionId of Object.keys(bySection)) {
          const s = bySection[sectionId];
          // best-effort class/subject from Today index
          const tlist = todayIdx[studentId] || [];
          const t = tlist.find((x) => x.planId === planId);
          out.push({
            ...s,
            studentId,
            classId: t?.classId || "—",
            subjectId: t?.subjectId || "—",
          });
        }
      }
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    setRows(out);
  }, []);

  const [filter, setFilter] = React.useState("submitted"); // submitted|returned|all
  const [q, setQ] = React.useState("");

  const filtered = rows.filter(r => {
    const okStatus = filter === "all" ? true : r.status === filter;
    const qq = q.trim().toLowerCase();
    const okQ = !qq
      || r.studentId.toLowerCase().includes(qq)
      || String(r.classId).toLowerCase().includes(qq)
      || String(r.subjectId).toLowerCase().includes(qq)
      || (r.sectionId||"").toLowerCase().includes(qq)
      || (r.planId||"").toLowerCase().includes(qq);
    return okStatus && okQ;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Inbox</div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs opacity-70">Filter:</span>
        <Button size="sm" variant={filter==="submitted"?"secondary":"ghost"} onClick={()=>setFilter("submitted")}>Submitted</Button>
        <Button size="sm" variant={filter==="returned"?"secondary":"ghost"} onClick={()=>setFilter("returned")}>Returned</Button>
        <Button size="sm" variant={filter==="all"?"secondary":"ghost"} onClick={()=>setFilter("all")}>All</Button>
        <input
          className="ml-auto w-64 rounded border border-slate-700 bg-slate-900 p-2 text-xs"
          placeholder="Search class/subject/student/section…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          {filtered.map(r => (
            <button
              key={r.id}
              className="w-full text-left p-3 rounded border border-slate-700 hover:border-blue-500"
              onClick={()=>setFocus({ planId: r.planId, sectionId: r.sectionId })}
            >
              <div className="text-sm font-medium">{r.studentId} · <span className="opacity-70">{r.status}</span></div>
              <div className="text-xs opacity-70">
                {r.classId} · {r.subjectId} · {(r.sectionId||"section")} · {new Date(r.updatedAt).toLocaleString()}
              </div>
            </button>
          ))}
          {!filtered.length && <div className="text-xs opacity-70">No items.</div>}
        </div>

        <div className="min-h-[200px]">
          {!focus && <div className="text-sm opacity-70 p-3 rounded border border-dashed border-slate-700">Select an item to review.</div>}
          {focus && (
            <SubmissionReviewPanel
              planId={focus.planId}
              sectionId={focus.sectionId}
              onClose={()=>setFocus(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

