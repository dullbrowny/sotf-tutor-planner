
import React, { useEffect, useMemo, useState } from "react";
import CitationLink from "../../components/CitationLink.jsx";
import { list as listAssignments } from "../../services/assignments.js";

/**
 * Student Dashboard (v2)
 * - Shows published assignments from localStorage store.
 * - Adds on-page filters so it works even if global scope isn't wired.
 * - Displays AI-enriched content when present (Q/A).
 */

export default function StudentDashboard(){
  const all = listAssignments(); // all statuses
  const published = all.filter(a => a.status === "published");

  // derive filters
  const grades = Array.from(new Set(published.map(a => a.grade))).sort((a,b)=>a-b);
  const subjects = Array.from(new Set(published.map(a => a.subject)));

  const [grade, setGrade] = useState(grades[0] || 9);
  const [subject, setSubject] = useState(subjects[0] || "Science");

  const items = useMemo(() => {
    return published.filter(a =>
      (grade ? a.grade === Number(grade) : true) &&
      (subject ? a.subject === subject : true)
    ).sort((a,b)=> (b.publishedAt||"").localeCompare(a.publishedAt||""));
  }, [published, grade, subject]);

  useEffect(() => {
    // If current selection has no items, broaden automatically
    if (!items.length && (grades.length || subjects.length)) {
      if (grades.length && grade !== grades[0]) setGrade(grades[0]);
      if (subjects.length && subject !== subjects[0]) setSubject(subjects[0]);
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs block mb-1 opacity-75">Class</label>
          <select className="rounded bg-slate-900 border border-slate-700 p-2" value={grade} onChange={e=>setGrade(Number(e.target.value))}>
            {grades.length ? grades.map(g => <option key={g} value={g}>Class {g}</option>) : <option>Class 9</option>}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1 opacity-75">Subject</label>
          <select className="rounded bg-slate-900 border border-slate-700 p-2" value={subject} onChange={e=>setSubject(e.target.value)}>
            {subjects.length ? subjects.map(s => <option key={s} value={s}>{s}</option>) : <option>Science</option>}
          </select>
        </div>
      </div>

      {!items.length ? (
        <div className="text-sm opacity-70">No assignments yet.</div>
      ) : (
        items.map(a => (
          <div key={a.id} className="rounded-xl border border-slate-700 p-3 bg-slate-800/40">
            <div className="text-xs opacity-70 mb-1">
              {new Date(a.publishedAt || a.createdAt).toLocaleString()} · {a.subject} · {a.targetMin} min
            </div>
            <div className="font-medium mb-2">{a.chapterId} · {a.topic}</div>

            <ul className="list-disc ml-5 text-sm space-y-3">
              {a.items.map(it => (
                <li key={it.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span>{it.text}</span>
                    <CitationLink className="underline" refObj={{ chapterId: it.chapterId, anchor: it.anchor, title: it.chapterName }} />
                  </div>
                  {it.ai && (
                    <pre className="text-xs whitespace-pre-wrap bg-slate-900/60 p-2 rounded">{it.ai}</pre>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
