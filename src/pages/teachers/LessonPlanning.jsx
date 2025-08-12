import React, { useMemo, useState } from "react";
import { useScope } from "../../context/ScopeProvider";
import { api } from "../../api";
import { Card } from "../../ui/Card";
import CitationLink from "../../components/CitationLink";
import { assignMicroplan } from "../../state/assignments"; // writes to localStorage

function resolveClassId({ scope, classes = [], teacherGroups = [], klass }) {
  if (scope?.kind === "class" && scope.classId) return scope.classId;
  if (scope?.kind === "teacherGroup" && scope.groupId) {
    const g = teacherGroups.find(x => x.id === scope.groupId);
    if (g?.classId) return g.classId;
  }
  const byGrade = classes.find(c => String(c.grade) === String(klass));
  return byGrade?.id || classes[0]?.id || "8A";
}

export default function LessonPlanning() {
  const { scope, classes = [], teacherGroups = [] } = useScope();

  const [klass, setKlass] = useState(8);
  const [subject, setSubject] = useState("Math");
  const [selectedLOs, setSelectedLOs] = useState([]);
  const [target, setTarget] = useState(20);
  const [plan, setPlan] = useState([]);

  const los = useMemo(() => api.cbse?.getLOs({ klass, subject }) || [], [klass, subject]);
  const total = plan.reduce((a, b) => a + (b.estMinutes || 6), 0);

  function packToTarget(items, targetMin) {
    const sorted = [...items].sort((a, b) => (a.estMinutes || 6) - (b.estMinutes || 6));
    const out = []; let s = 0;
    for (const x of sorted) { const m = x.estMinutes || 6; if (s + m > targetMin + 2) continue; out.push(x); s += m; if (s >= targetMin - 2) break; }
    let i = 0; while (s < targetMin - 2 && i < sorted.length) { const x = sorted[i++]; if (out.includes(x)) continue; out.push(x); s += (x.estMinutes || 6); }
    return out;
  }

  function toggleLO(id) { setSelectedLOs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }

  function generate() {
    if (!selectedLOs.length) return setPlan([]);
    const all = api.cbse?.getExercisesByLO(selectedLOs, { limit: 24 }) || [];
    setPlan(packToTarget(all, target));
  }

  function sendToStudents() {
    if (!plan.length) { alert("No items in plan."); return; }
    const classId = resolveClassId({ scope, classes, teacherGroups, klass });
    const now = new Date();
    const dueISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0).toISOString(); // local EOD

    const a = assignMicroplan({ classId, subject, items: plan, dueISO });
    alert(`✅ Assigned ${plan.length} items (${total} min) to ${classId}\nAssignment: ${a.id}`);
  }

  return (
    <>
      <Card title="Tutor · Lesson Planner (CBSE · Class 8–10)">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-slate-300">Class</div>
            <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" value={klass} onChange={e => setKlass(Number(e.target.value))}>
              {[8,9,10].map(n => <option key={n} value={n}>Class {n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-300">Subject</div>
            <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" value={subject} onChange={e => setSubject(e.target.value)}>
              <option>Math</option><option>Science</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-300">Target time</div>
            <div className="flex items-center gap-2">
              {[15,20,30].map(m => (
                <label key={m} className={`text-xs px-2 py-1 rounded border cursor-pointer ${target===m ? "bg-sky-700/30 border-sky-600 text-sky-200" : "bg-slate-800/60 border-slate-700"}`}>
                  <input type="radio" name="t" className="mr-1 accent-sky-500" checked={target===m} onChange={()=>setTarget(m)} /> {m} min
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-end"><button className="btn-primary ml-auto" onClick={generate}>Generate Microplan (≈{target} min)</button></div>
        </div>

        <div className="mt-4">
          <div className="text-xs text-slate-300 mb-1">Learning Objectives</div>
          <div className="flex flex-wrap gap-2">
            {los.map(lo => (
              <label key={lo.id} className={"text-xs px-2 py-1 rounded border cursor-pointer " + (selectedLOs.includes(lo.id) ? "bg-sky-700/30 border-sky-600 text-sky-200" : "bg-slate-800/60 border-slate-700 text-slate-200")}>
                <input type="checkbox" className="mr-1 accent-sky-500" checked={selectedLOs.includes(lo.id)} onChange={()=>toggleLO(lo.id)} />
                {lo.label}
              </label>
            ))}
            {!los.length && <span className="text-xs text-slate-400">No LOs found.</span>}
          </div>
        </div>
      </Card>

      <Card title={`Auto-Microplan ${plan.length ? `· ${total} min` : ''}`}>
        <div className="space-y-2">
          {plan.map(x => (
            <div key={x.id} className="card p-3">
              <div className="text-sm font-medium">{x.qno} · {x.preview}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">Est. {x.estMinutes} min</span>
                {x?.citation && <CitationLink refObj={x.citation} />}
              </div>
            </div>
          ))}
          {!plan.length && <div className="text-sm text-slate-400">Select LO(s) and click “Generate Microplan”.</div>}
        </div>

        <div className="mt-3 flex justify-end">
          <button className="btn-primary" disabled={!plan.length} onClick={sendToStudents}>Send to Students</button>
        </div>
      </Card>
    </>
  );
}

