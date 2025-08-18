import React, { useMemo } from "react";
import Button from "../../ui/Button.jsx";

function readJSON(k, fb){ try{const v=localStorage.getItem(k); return v?JSON.parse(v):fb;}catch{return fb;} }
const todayStr = () => new Date().toISOString().slice(0,10);

export default function AssignmentsPane({ studentId }){
  const todays = useMemo(()=>{
    const raw = readJSON("sof.today.v1", {});
    const arr = raw[studentId] || [];
    // current + recent (last 3 days) to avoid empty demo when not “today”
    const dcut = new Date(); dcut.setDate(dcut.getDate()-3);
    const isoCut = dcut.toISOString().slice(0,10);
    return arr.filter(t => (t.date >= isoCut)).sort((a,b)=> b.date.localeCompare(a.date));
  }, [studentId]);

  function sendNudge(planId){
    const K="sof.nudges.v1";
    const arr = readJSON(K,[]);
    arr.unshift({ id:`n_${Date.now()}`, ts: Date.now(), studentId, planId, kind:"parent_nudge", text:"Please finish your work and submit.", status:"open" });
    localStorage.setItem(K, JSON.stringify(arr));
    alert("Nudge sent to teacher.");
  }

  function askClarification(planId){
    const K="sof.requests.v1";
    const arr = readJSON(K,[]);
    arr.unshift({ id:`r_${Date.now()}`, ts: Date.now(), studentId, planId, text:"Parent asks for clarification on the assignment.", status:"open" });
    localStorage.setItem(K, JSON.stringify(arr));
    alert("Clarification requested.");
  }

  if (!studentId) return <div className="text-slate-400">Pick a student in “Open as…”.</div>;
  if (!todays.length) return <div className="text-slate-400">No assignments in the last few days.</div>;

  return (
    <div className="space-y-4">
      {todays.map(t => {
        const total = t.sections?.length||0;
        const done = t.sections?.filter(s=>s.status==="done").length||0;
        const started = t.sections?.filter(s=>s.status!=="todo").length||0;
        const pct = total ? Math.round((done*100)/total) : 0;
        return (
          <div key={`${t.planId}-${t.date}`} className="p-3 rounded-xl bg-[#0f172a] border border-[#1f2937]">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-200">{t.classId} · {t.planId}</div>
              <div className="chip">{t.date===todayStr()?"Today":"Recent"}</div>
            </div>
            <div className="mt-2 text-sm text-slate-300">Progress: {done}/{total} done ({pct}%)</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(t.sections||[]).map(s=>(
                <span key={s.id} className={`chip ${s.status==="done"?"chip-ok":s.status==="in_progress"?"chip-warn":"chip-muted"}`}>
                  {s.title || s.id}: {s.status==="done"?"✓":s.status==="in_progress"?"▶︎":"—"}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={()=>askClarification(t.planId)}>Ask clarification</Button>
              <Button variant="primary" onClick={()=>sendNudge(t.planId)}>Nudge teacher</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

