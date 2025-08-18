// src/pages/admin/Predictive.jsx
import React, { useMemo } from "react";
import Card from "../../ui/Card.jsx";

/* ---------- data helpers ---------- */
const readJSON = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const todayISO = () => new Date().toISOString().slice(0,10);

function flattenToday() {
  const byStudent = readJSON("sof.today.v1", {});
  const all = [];
  for (const [studentId, arr] of Object.entries(byStudent || {})) {
    (arr || []).forEach(t => all.push({ studentId, ...t }));
  }
  return all;
}
function readEvents() { return readJSON("sof.events.v1", []); }

/* ---------- metrics ---------- */
function computeBasics() {
  const all = flattenToday();
  const today = all.filter(t => t.date === todayISO());
  const totals = today.reduce((acc, t) => {
    const secs = t.sections || [];
    acc.sections += secs.length;
    acc.started += secs.filter(s => s.status !== "todo").length;
    acc.done    += secs.filter(s => s.status === "done").length;
    return acc;
  }, { sections: 0, started: 0, done: 0 });

  return { all, today, ...totals };
}

function cohortsCompletion(today) {
  // key: classId||subjectId -> completion %
  const map = new Map();
  for (const t of today) {
    const key = `${t.classId || ""}||${t.subjectId || ""}`;
    if (!map.has(key)) map.set(key, { classId: t.classId, subjectId: t.subjectId, total: 0, done: 0 });
    const g = map.get(key);
    const secs = t.sections || [];
    g.total += secs.length;
    g.done += secs.filter(s => s.status === "done").length;
  }
  return Array.from(map.values()).map(g => ({
    classId: g.classId || "—",
    subjectId: g.subjectId || "—",
    pct: g.total ? Math.round((g.done * 100) / g.total) : 0
  }));
}

function topBottlenecks(today) {
  // Aggregate sections by (planId, sectionId, title)
  const map = new Map();
  for (const t of today) {
    for (const s of t.sections || []) {
      const key = `${t.planId}||${s.id}||${s.title || s.id}`;
      if (!map.has(key)) map.set(key, { planId: t.planId, sectionId: s.id, title: s.title || s.id, todo: 0, inprog: 0, done: 0 });
      const g = map.get(key);
      if (s.status === "done") g.done++; else if (s.status === "in_progress") g.inprog++; else g.todo++;
    }
  }
  // score: not-done load (todo + in_progress) with a small weight for in_progress
  const rows = Array.from(map.values()).map(g => {
    const nd = g.todo + g.inprog;
    const score = nd * 2 + g.inprog; // emphasize fully idle
    return { ...g, score, nd };
  });
  return rows.sort((a,b)=> b.score - a.score).slice(0, 5);
}

function acceptReturn(events) {
  const acc = { accepted: 0, returned: 0, has: false };
  for (const e of events) {
    if (e.name === "submission.accepted") { acc.accepted++; acc.has = true; }
    if (e.name === "submission.returned") { acc.returned++; acc.has = true; }
  }
  return acc;
}

function activitySeries(events) {
  // last 8 hours; two series: started / completed
  const hours = Array.from({ length: 8 }, (_, i) => Date.now() - (7 - i) * 60 * 60 * 1000);
  const bucket = (ts) => Math.max(0, Math.min(7, Math.floor((ts - (Date.now() - 8 * 60 * 60 * 1000)) / (60 * 60 * 1000))));
  const baseStart = Array(8).fill(0), baseDone = Array(8).fill(0);

  events.forEach(e => {
    if (!e.ts) return;
    const t = +e.ts;
    if (t < Date.now() - 8 * 60 * 60 * 1000) return;
    if (t > Date.now()) return;
    const b = bucket(t);
    if (e.name === "attempt.started") baseStart[b]++;
    if (e.name === "attempt.completed") baseDone[b]++;
  });
  return { start: baseStart, done: baseDone };
}

/* ---------- tiny visuals ---------- */
const Bar = ({ value=0, max=100, label, color="#3b82f6" }) => (
  <div className="w-full">
    <div className="h-2 rounded bg-[#111827] overflow-hidden">
      <div className="h-2" style={{ width: `${Math.min(100, Math.round((value*100)/Math.max(1,max)))}%`, background: color }} />
    </div>
    {label ? <div className="text-xs text-slate-400 mt-1">{label}</div> : null}
  </div>
);

function HeatBox({ pct }) {
  // green at 100, red at 0
  const hue = Math.round((pct/100) * 120); // 0=red,120=green
  const bg = `hsl(${hue}, 70%, 35%)`;
  return (
    <div className="h-10 rounded flex items-center justify-center text-sm font-medium" style={{ background: bg }}>
      {pct}%
    </div>
  );
}

function Histogram({ seriesA=[], seriesB=[], width=280, height=60 }) {
  const n = Math.max(seriesA.length, seriesB.length);
  if (!n) return null;
  const maxV = Math.max(1, ...seriesA, ...seriesB);
  const w = (width - (n - 1) * 6) / n;
  return (
    <svg width={width} height={height}>
      {seriesA.map((v,i)=> {
        const h = Math.round((v/maxV)*height);
        return <rect key={`a${i}`} x={i*(w+6)} y={height-h} width={w} height={h} fill="#3b82f6" />;
      })}
      {seriesB.map((v,i)=> {
        const h = Math.round((v/maxV)*height);
        return <rect key={`b${i}`} x={i*(w+6)} y={height-h} width={w} height={h} fill="#22c55e" opacity="0.75" />;
      })}
    </svg>
  );
}

/* ---------- page ---------- */
export default function Predictive() {
  const { all, today, sections, started, done } = useMemo(() => computeBasics(), []);
  const cohorts = useMemo(() => cohortsCompletion(today), [today]);
  const bottlenecks = useMemo(() => topBottlenecks(today), [today]);
  const events = useMemo(() => readEvents(), []);
  const ar = useMemo(() => acceptReturn(events), [events]);
  const series = useMemo(() => activitySeries(events), [events]);

  return (
    <Card title="Admin · Predictive Analytics">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1f2937]">
          <div className="text-slate-400 text-xs">Sections today</div>
          <div className="text-2xl font-semibold">{sections}</div>
          <Bar value={done} max={sections} label={`${done}/${sections} done`} color="#22c55e" />
        </div>
        <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1f2937]">
          <div className="text-slate-400 text-xs">Started</div>
          <div className="text-2xl font-semibold">{started}</div>
          <Bar value={started} max={sections} label={`${Math.round((started*100)/Math.max(1,sections))}% started`} color="#f59e0b" />
        </div>
        <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1f2937]">
          <div className="text-slate-400 text-xs">Accepted</div>
          <div className="text-2xl font-semibold">{ar.has ? ar.accepted : "—"}</div>
          <div className="text-xs text-slate-400 mt-1">{ar.has ? `Returned: ${ar.returned}` : "N/A in current demo"}</div>
        </div>
        <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1f2937]">
          <div className="text-slate-400 text-xs">Activity (last 8h)</div>
          <Histogram seriesA={series.start} seriesB={series.done} />
          <div className="text-xs text-slate-400 mt-1">Blue: started · Green: completed</div>
        </div>
      </div>

      {/* Cohort heatmap */}
      <div className="grid grid-cols-6 gap-2 mb-6">
        <div className="col-span-6 text-slate-300 mb-1">Cohort completion heatmap (today)</div>
        {cohorts.length ? cohorts.map((c,i)=>(
          <div key={i} className="p-2 rounded-lg bg-[#0b1220] border border-[#1f2937]">
            <div className="text-xs text-slate-300 mb-1">{c.classId} · {c.subjectId}</div>
            <HeatBox pct={c.pct} />
          </div>
        )) : <div className="text-slate-400 text-sm col-span-6">No activity yet.</div>}
      </div>

      {/* Bottlenecks */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-slate-300 mb-2">Top bottlenecks (not-done load)</div>
          <div className="space-y-2">
            {bottlenecks.length ? bottlenecks.map((b, i)=>(
              <div key={i} className="p-3 rounded-lg bg-[#0f172a] border border-[#1f2937]">
                <div className="font-medium text-sm">{b.title}</div>
                <div className="text-xs text-slate-400">Plan {b.planId} · Sec {b.sectionId}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>Todo: <b>{b.todo}</b></div>
                  <div>In progress: <b>{b.inprog}</b></div>
                  <div>Done: <b>{b.done}</b></div>
                </div>
              </div>
            )) : <div className="text-slate-400 text-sm">None 🎉</div>}
          </div>
        </div>

        <div>
          <div className="text-slate-300 mb-2">What to watch</div>
          <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1">
            <li>Low completion cohorts (heatmap cells &lt; 40%) → consider a reminder.</li>
            <li>Bottlenecks with many “Todo” → send hint or schedule reteach.</li>
            <li>Spikes in “Started” without “Completed” in the histogram → investigate confusion.</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

