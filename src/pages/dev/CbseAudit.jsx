import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Card } from "../../ui/Card";
import CitationLink from "../../components/CitationLink";
import { annotateWithChapter } from "../../services/chapterRef";

const CLASSES = [8, 9, 10];
const SUBJECTS = ["Math", "Science"];

export default function CbseAudit() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [counts, setCounts] = useState({ los: 0, ex: 0, cited: 0 });

  const FLAGS = {
    DATA_DOMAIN: import.meta.env.VITE_DATA_DOMAIN,
    USE_MOCKS: import.meta.env.VITE_USE_MOCKS,
  };

  useEffect(() => { refresh(); }, []);

  function refresh() {
    const out = [];
    let losN = 0, exN = 0, citedN = 0;

    for (const klass of CLASSES) {
      for (const subject of SUBJECTS) {
        const los = api.cbse?.getLOs({ klass, subject }) || [];
        for (const lo of los) {
          losN++;
          const ex = api.cbse?.getExercisesByLO([lo.id], { limit: 50 }) || [];
          exN += ex.length;
          citedN += ex.filter(x => !!x.citation).length;
          out.push({
            klass, subject, loId: lo.id, loLabel: lo.label,
            exCount: ex.length,
            cited: ex.filter(x => !!x.citation).length,
            samples: ex.slice(0, 2),
          });
        }
      }
    }
    setCounts({ los: losN, ex: exN, cited: citedN });
    setRows(out);
  }

  function endOfTodayISO() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 0).toISOString();
  }

  function seedDemoData() {
    const classId = "8A";
    const subject = "Math";
    const now = new Date();

    const los = api.cbse?.getLOs({ klass: 8, subject }) || [];
    const loIds = los.slice(0, 2).map(l => l.id);
    const ex = (loIds.length ? (api.cbse?.getExercisesByLO(loIds, { limit: 6 }) || []) : []).slice(0, 2);

    const baseItems = (ex.length ? ex : [
      { qno: "8.1 Q3", preview: "Percentage increase word problem.", estMinutes: 5, citation: null },
      { qno: "8.2 Q5", preview: "Profit percent word problem.",     estMinutes: 7, citation: null },
    ]).map((x, i) => ({
      id: `it${i + 1}`,
      qno: x.qno,
      preview: x.preview,
      estMinutes: x.estMinutes ?? (i ? 7 : 5),
      citation: x.citation || null,
    }));

    const annotated = annotateWithChapter(baseItems, loIds).map((x, i) => ({
      ...x,
      phase: ["warmup","teach","practice","reflect"][Math.min(i,3)] || "practice",
    }));

    const a = {
      id: `dbg_${Date.now()}`,
      classId,
      subject,
      createdAt: now.toISOString(),
      dueISO: endOfTodayISO(),
      items: annotated,
    };

    const AKEY = "sotf.assignments.v1";
    const assignments = JSON.parse(localStorage.getItem(AKEY) || "[]");
    assignments.unshift(a);
    localStorage.setItem(AKEY, JSON.stringify(assignments));

    const FKEY = "sotf.flags.v1";
    const flags = JSON.parse(localStorage.getItem(FKEY) || "[]");
    flags.unshift({ id: `flag_${Date.now()}_c`, ts: Date.now(), target: "class", classId, kind: "Attendance", text: "Attendance dip this week." });
    flags.unshift({ id: `flag_${Date.now()}_s`, ts: Date.now(), target: "student", studentId: "s-arya", kind: "Concept", text: "Revisit Comparing Quantities." });
    localStorage.setItem(FKEY, JSON.stringify(flags));

    const NKEY = "sotf.nudges.v1";
    const nudges = JSON.parse(localStorage.getItem(NKEY) || "[]");
    nudges.unshift({ id: `n_${Date.now()}`, ts: Date.now(), fromParentGroup: "pg-8a", toStudentId: "s-arya", text: "Let’s finish today’s plan by 8pm!" });
    localStorage.setItem(NKEY, JSON.stringify(nudges));

    const RKEY = "sotf.requests.v1";
    const reqs = JSON.parse(localStorage.getItem(RKEY) || "[]");
    reqs.unshift({ id: `req_${Date.now()}`, ts: Date.now(), fromParentGroup: "pg-8a", classId, text: "Request teacher feedback on progress.", status: "open" });
    localStorage.setItem(RKEY, JSON.stringify(reqs));

    alert("🌱 Seeded demo data.");
    refresh();
    setTimeout(() => location.reload(), 200);
  }

  function clearDemoData() {
    ["sotf.assignments.v1", "sotf.attempts.v1", "sotf.flags.v1", "sotf.nudges.v1", "sotf.requests.v1", "classFeed:v1"]
      .forEach(k => localStorage.removeItem(k));
    alert("✅ Demo data cleared.");
    refresh();
    setTimeout(() => location.reload(), 200);
  }

  const filtered = rows.filter(r => {
    if (filter === "missingCitation") return r.exCount > 0 && r.cited < r.exCount;
    if (filter === "noExercises") return r.exCount === 0;
    return true;
  });

  return (
    <Card title="CBSE Pack QA">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
        <span>
          Env: <span className="font-mono">VITE_DATA_DOMAIN={String(FLAGS.DATA_DOMAIN || "—")}</span>
          <span className="opacity-50"> · </span>
          <span className="font-mono">VITE_USE_MOCKS={String(FLAGS.USE_MOCKS || "0")}</span>
        </span>

        {import.meta.env.VITE_USE_MOCKS === '1' && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={seedDemoData}
              title="Seed demo data"
              aria-label="Seed demo data"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10 active:bg-emerald-500/20 transition"
            >
              <span className="text-xl leading-none" aria-hidden>＋</span>
            </button>
            <button
              type="button"
              onClick={clearDemoData}
              title="Clear demo data"
              aria-label="Clear demo data"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-500 text-rose-300 hover:bg-rose-500/10 active:bg-rose-500/20 transition"
            >
              <span className="text-xl leading-none" aria-hidden>⟲</span>
            </button>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Filter:</span>
        <select
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="missingCitation">Missing citation</option>
          <option value="noExercises">No exercises</option>
        </select>

        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          <span>LOs: {counts.los}</span>
          <span>Exercises: {counts.ex}</span>
          <span>Cited: {counts.cited}</span>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-300">
              <th className="py-2 pr-4">Class</th>
              <th className="py-2 pr-4">Subject</th>
              <th className="py-2 pr-4">LO</th>
              <th className="py-2 pr-4">Exercises</th>
              <th className="py-2 pr-4">Cited</th>
              <th className="py-2 pr-4">Samples</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-slate-800">
                <td className="py-2 pr-4">Class {r.klass}</td>
                <td className="py-2 pr-4">{r.subject}</td>
                <td className="py-2 pr-4">{r.loLabel}</td>
                <td className="py-2 pr-4">{r.exCount}</td>
                <td className="py-2 pr-4">{r.cited}</td>
                <td className="py-2 pr-4">
                  {r.samples.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="opacity-80">{s.qno}</span>
                      {s?.citation && <CitationLink refObj={s.citation} />}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

