// src/pages/admin/Insights.jsx
import React, { useMemo } from "react";
import Card from "../../ui/Card.jsx";

/* ---------- storage helpers ---------- */
function readJSON(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function flattenToday() {
  const byStudent = readJSON("sof.today.v1", {});
  const all = [];
  for (const [studentId, arr] of Object.entries(byStudent || {})) {
    (arr || []).forEach(t => all.push({ studentId, ...t }));
  }
  return all;
}
function readEvents() { return readJSON("sof.events.v1", []); }
const todayStr = () => new Date().toISOString().slice(0,10);
const pct = (n,d) => d ? Math.round((n*100)/d) : 0;

/* ---------- metrics ---------- */
function groupByClassSubject(todays) {
  const map = new Map();
  for (const t of todays) {
    const key = `${t.classId}||${t.subjectId}`;
    if (!map.has(key)) map.set(key, { classId:t.classId, subjectId:t.subjectId, sections:[], students:new Set(), lastTs:0 });
    const g = map.get(key);
    g.sections.push(...(t.sections||[]));
    g.students.add(t.studentId);
  }
  // attach last update time from events
  const ev = readEvents();
  for (const e of ev) {
    const key = `${e.classId||""}||${e.subjectId||""}`;
    if (map.has(key)) map.get(key).lastTs = Math.max(map.get(key).lastTs, e.ts||0);
  }
  for (const g of map.values()) {
    const total = g.sections.length;
    const done = g.sections.filter(s=>s.status==="done").length;
    const started = g.sections.filter(s=>s.status!=="todo").length;
    const inprog = g.sections.filter(s=>s.status==="in_progress").length;
    const todo = total - done - inprog;
    g.total = total; g.done = done; g.started = started; g.todo = todo; g.inprog = inprog;
    g.completionPct = pct(done,total);
    g.startedPct = pct(started,total);
    g.students = Array.from(g.students);
  }
  return Array.from(map.values()).sort((a,b)=> (a.classId||"").localeCompare(b.classId||"") || (a.subjectId||"").localeCompare(b.subjectId||""));
}

function lastFivePlansCompletion(all) {
  const byPlan = new Map();
  for (const t of all) {
    const k = t.planId;
    if (!k) continue;
    if (!byPlan.has(k)) byPlan.set(k, { planId:k, date:t.date, sections:[] });
    byPlan.get(k).sections.push(...(t.sections||[]));
    if (t.date > byPlan.get(k).date) byPlan.get(k).date = t.date;
  }
  const list = Array.from(byPlan.values()).sort((a,b)=> (b.date||"").localeCompare(a.date||"")).slice(0,5);
  return list.map(p => {
    const tot = p.sections.length;
    const done = p.sections.filter(s=>s.status==="done").length;
    return { label: p.date?.slice(5) || p.planId.slice(-4), value: pct(done, tot) };
  }).reverse();
}

/* Pending review >24h: naive rule based on events.
   We consider a section pending if the latest event for (student,plan,section)
   is 'attempt.completed' and there is no later 'submission.accepted'|'returned'. */
function pendingOver24h() {
  const ev = readEvents().sort((a,b)=> (a.ts||0)-(b.ts||0));
  const last = new Map();
  ev.forEach(e=>{
    const k = `${e.studentId||""}|${e.planId||""}|${e.sectionId||""}`;
    last.set(k, e);
  });
  const out = [];
  const cutoff = Date.now() - 24*60*60*1000;
  for (const [k, e] of last.entries()) {
    if (e.name === "attempt.completed" && e.ts <= cutoff) {
      out.push({
        key: k, studentId: e.studentId, classId: e.classId, subjectId: e.subjectId,
        planId: e.planId, sectionId: e.sectionId, ts: e.ts
      });
    }
  }
  return out.sort((a,b)=> (a.ts||0)-(b.ts||0));
}

/* ---------- visuals ---------- */
function StackedBar({ todo=0, inprog=0, done=0, width=280, height=10 }) {
  const total = todo+inprog+done || 1;
  const wTodo = (todo/total)*width, wProg=(inprog/total)*width, wDone=(done/total)*width;
  return (
    <svg width={width} height={height} style={{borderRadius:6, overflow:"hidden", background:"#111827"}}>
      <rect x="0" y="0" width={wTodo} height={height} fill="#374151"/>
      <rect x={wTodo} y="0" width={wProg} height={height} fill="#f59e0b"/>
      <rect x={wTodo+wProg} y="0" width={wDone} height={height} fill="#22c55e"/>
    </svg>
  );
}
function Sparkline({ points, width=220, height=42 }) {
  if (!points?.length) return null;
  const xs = points.map((_,i)=> i/(points.length-1));
  const ys = points.map(p => 1 - (p.value/100));
  return (
    <svg width={width} height={height}>
      <polyline fill="none" stroke="#3b82f6" strokeWidth="2"
        points={xs.map((x,i)=>`${Math.round(x*width)},${Math.round(ys[i]*height)}`).join(" ")} />
    </svg>
  );
}

/* Teacher responses drilldown */
function goToResponses({ classId, subjectId, planId }) {
  const qp = new URLSearchParams({
    tab: "responses",
    classId: classId || "",
    subjectId: subjectId || "",
    planId: planId || ""
  }).toString();
  window.location.hash = `/teachers/lesson-planning?${qp}`;
}

export default function AdminInsights(){
  const all = useMemo(() => flattenToday(), []);
  const todays = useMemo(() => all.filter(t => t.date === todayStr()), [all]);
  const groups = useMemo(()=> groupByClassSubject(todays), [todays]);
  const spark = useMemo(()=> lastFivePlansCompletion(all), [all]);
  const overdue = useMemo(()=> pendingOver24h(), []);

  // light KPIs
  const k_submissionsToday = useMemo(()=>{
    const ev = readEvents().filter(e=> new Date(e.ts||0).toISOString().slice(0,10)===todayStr());
    return ev.filter(e=>e.name==="attempt.completed").length;
  }, []);
  const k_activeStudents = new Set(todays.map(t=>t.studentId)).size;

  return (
    <>
      <Card title="Lesson Insights">
        {/* KPI tiles */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1f2937]">
            <div className="text-slate-400 text-xs">Submissions today</div>
            <div className="text-2xl font-semibold">{k_submissionsToday}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1f2937]">
            <div className="text-slate-400 text-xs">Active students today</div>
            <div className="text-2xl font-semibold">{k_activeStudents}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1f2937]">
            <div className="text-slate-400 text-xs">Pending review &gt; 24h</div>
            <div className="text-2xl font-semibold">{overdue.length}</div>
          </div>
        </div>

        {/* Today stacked bars */}
        <div className="space-y-3">
          {groups.length ? groups.map((g, i)=>(
            <div key={i} className="flex items-center gap-3">
              <div className="w-56 text-slate-200">{g.classId} · {g.subjectId}</div>
              <StackedBar todo={g.todo} inprog={g.inprog} done={g.done}/>
              <div className="text-xs text-slate-400 w-48 text-right">
                {g.total} sections · {g.completionPct}% done
              </div>
            </div>
          )) : <div className="text-slate-400">No activity today yet.</div>}
        </div>

        {/* Sparkline */}
        <div className="mt-6">
          <div className="text-slate-300 mb-1">Completion across last 5 plans</div>
          <Sparkline points={spark}/>
        </div>

        {/* Table + Drilldown */}
        <div className="mt-6 grid grid-cols-5 gap-6">
          <div className="col-span-3 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300">
                  <th className="py-2 pr-4">Class</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Completion%</th>
                  <th className="py-2 pr-4">Started%</th>
                  <th className="py-2 pr-4">Done</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g,i)=>(
                  <tr key={i}
                      className="border-t border-slate-800 hover:bg-[#0b1220] cursor-pointer"
                      onClick={()=>goToResponses({ classId:g.classId, subjectId:g.subjectId })}>
                    <td className="py-2 pr-4">{g.classId}</td>
                    <td className="py-2 pr-4">{g.subjectId}</td>
                    <td className="py-2 pr-4">{g.completionPct}%</td>
                    <td className="py-2 pr-4">{g.startedPct}%</td>
                    <td className="py-2 pr-4">{g.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending >24h panel */}
          <div className="col-span-2">
            <div className="text-slate-300 mb-2">Overdue reviews (&gt;24h)</div>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {overdue.length ? overdue.map(o=>(
                <div key={o.key} className="p-2 rounded-lg bg-[#0f172a] border border-[#1f2937]">
                  <div className="text-sm">{o.studentId} · {o.classId} · {o.subjectId}</div>
                  <div className="text-xs text-slate-400">Plan {o.planId} · Sec {o.sectionId}</div>
                  <div className="mt-2">
                    <button className="btn btn-outline text-xs"
                            onClick={()=>goToResponses({ classId:o.classId, subjectId:o.subjectId, planId:o.planId })}>
                      Open in Responses
                    </button>
                  </div>
                </div>
              )) : <div className="text-slate-400 text-sm">None 🎉</div>}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

