import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Card } from "../../ui/Card";
import CitationLink from "../../components/CitationLink";
import { clearAllAssignments } from "../../state/assignments";

const CLASSES = [8,9,10];
const SUBJECTS = ["Math","Science"];

export default function CbseAudit() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all"); // all|missingCitation|noExercises
  const [counts, setCounts] = useState({ los: 0, ex: 0, cited: 0 });

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
            samples: ex.slice(0,2),
          });
        }
      }
    }
    setCounts({ los: losN, ex: exN, cited: citedN });
    setRows(out);
  }

  useEffect(() => { refresh(); }, []);

  const filtered = rows.filter(r => {
    if (filter === "missingCitation") return r.exCount > 0 && r.cited < r.exCount;
    if (filter === "noExercises") return r.exCount === 0;
    return true;
  });

  return (
    <Card title="CBSE Pack QA">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Filter:</span>
        <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="missingCitation">Missing citation</option>
          <option value="noExercises">No exercises</option>
        </select>

        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          <span>LOs: {counts.los}</span>
          <span>Exercises: {counts.ex}</span>
          <span>Cited: {counts.cited}</span>
        </div>

        <button
          className="btn-secondary ml-2"
          onClick={() => { clearAllAssignments(); alert("Demo assignments cleared."); }}
        >
          Clear demo data
        </button>
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
              <tr key={i} className="border-top border-slate-800">
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

