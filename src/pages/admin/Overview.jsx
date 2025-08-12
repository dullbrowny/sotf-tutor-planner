import React, { useEffect, useState } from "react";
import { Card } from "../../ui/Card";
import { api } from "../../api";
import { getParentRequests } from "../../state/nudges";
import { annotateWithChapter } from "../../services/chapterRef";

const CLASSES = [8, 9, 10];
const SUBJECTS = ["Math", "Science"];

export default function AdminOverview() {
  const [snapshot, setSnapshot] = useState([]);

  useEffect(() => {
    const out = [];
    for (const klass of CLASSES) {
      for (const subject of SUBJECTS) {
        const los = api.cbse?.getLOs({ klass, subject }) || [];
        let exCount = 0;
        los.forEach(lo => {
          const ex = api.cbse?.getExercisesByLO([lo.id], { limit: 50 }) || [];
          exCount += ex.length;
        });
        out.push({ klass, subject, los: los.length, ex: exCount });
      }
    }
    setSnapshot(out);
  }, []);

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

    // Flags / notices
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
    location.reload();
  }

  function clearDemoData() {
    ["sotf.assignments.v1", "sotf.attempts.v1", "sotf.flags.v1", "sotf.nudges.v1", "sotf.requests.v1", "classFeed:v1"]
      .forEach(k => localStorage.removeItem(k));
    alert("✅ Demo data cleared.");
    location.reload();
  }

  return (
    <>
      <Card title="Admin · Overview (CBSE)">
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-300">
            Coverage snapshot (demo): Classes 8–10 · Math/Science grounded to CBSE pack.
          </div>

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

        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-300">
                <th className="py-2 pr-4">Class</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">LOs</th>
                <th className="py-2 pr-4">Exercises</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.map((r, i) => (
                <tr key={i} className="border-t border-slate-800">
                  <td className="py-2 pr-4">Class {r.klass}</td>
                  <td className="py-2 pr-4">{r.subject}</td>
                  <td className="py-2 pr-4">{r.los}</td>
                  <td className="py-2 pr-4">{r.ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {import.meta.env.VITE_USE_MOCKS === '1' && (
        <Card title="Signals & Requests (stub)">
          <div className="space-y-2 text-sm">
            <div>
              <div className="font-medium">Parent Requests</div>
              {(() => {
                const reqs = getParentRequests();
                if (!reqs.length) return <div className="text-slate-400">No requests.</div>;
                return (
                  <ul className="list-disc pl-5">
                    {reqs.map(r => (
                      <li key={r.id}>
                        {r.text} · <span className="opacity-70">{r.fromParentGroup}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
            <div>
              <div className="font-medium">Student Engagement (stub)</div>
              {(() => {
                const m = JSON.parse(localStorage.getItem("sotf.attempts.v1") || "{}");
                const vals = Object.values(m);
                const done = vals.filter(v => v === "done").length;
                const started = vals.filter(v => v === "inprogress").length;
                return <div>Total items started: <b>{started}</b> · Done: <b>{done}</b></div>;
              })()}
            </div>
            <div>
              <div className="font-medium">Teacher Coverage Signals (stub)</div>
              <div className="text-slate-400">Hook: send coverage snapshot from Teacher page.</div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

