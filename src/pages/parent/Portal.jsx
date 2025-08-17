
import React, { useEffect, useState } from "react";
import CitationLink from "../../components/CitationLink.jsx";
import { chapterIdToPretty } from "../../services/manifest.js";

export default function ParentPortal() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cbse.assignments.v1");
      const list = raw ? JSON.parse(raw) : [];
      setItems(list);
    } catch {
      setItems([]);
    }
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl text-slate-200 font-semibold">Parent Portal</h2>
      {items.length === 0 && <div className="text-slate-400">No published assignments yet.</div>}
      {items.map((a) => (
        <div key={a.key} className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <div className="text-slate-200">{chapterIdToPretty(a.chapterId)}</div>
            <div className="text-xs text-slate-400">Updated: {new Date(a.updatedAt || Date.now()).toLocaleString()}</div>
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {(a.los || []).length ? (
              <ul className="list-disc ml-5">
                {a.los.map((lo, i) => <li key={i}>{lo}</li>)}
              </ul>
            ) : (
              <div className="text-slate-400">No LOs listed.</div>
            )}
          </div>
          <div className="mt-3 flex gap-3 text-sm">
            <span className="text-slate-400">Sources:</span>
            <CitationLink chapterId={a.chapterId} label="Chapter" />
            <CitationLink chapterId={a.chapterId} anchor="Exercises" label="Exercises" />
            <CitationLink chapterId={a.chapterId} anchor="Summary" label="Summary" />
          </div>
        </div>
      ))}
    </div>
  );
}
