import React, { useEffect, useState } from "react";
import { Card } from "../../ui/Card";

export default function PdfCalibrator() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [printed, setPrinted] = useState("");
  const [pdf, setPdf] = useState("");

  useEffect(() => {
    fetch("/cbse-pdf/manifest.json", { cache: "no-store" })
      .then(r => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  const offsets = JSON.parse(localStorage.getItem("cbse.pageOffsets.v1") || "{}");

  function save() {
    if (!selected) return;
    const p = Number(printed), q = Number(pdf);
    if (!Number.isFinite(p) || !Number.isFinite(q)) return alert("Enter numbers.");
    const delta = q - p;
    offsets[selected.chapterId] = delta;
    localStorage.setItem("cbse.pageOffsets.v1", JSON.stringify(offsets));
    alert(`Saved offset for ${selected.chapterId}: ${delta}`);
  }

  function exportEnv() {
    const json = JSON.stringify(offsets);
    navigator.clipboard.writeText(json).then(() => alert("Copied offsets JSON to clipboard."));
  }

  return (
    <Card title="PDF Offset Calibrator">
      <div className="text-sm text-slate-300 mb-3">
        Pick a chapter, open its PDF, go to a known printed page
        (e.g., p. 111), note the viewer’s page number, then enter both numbers.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-400 mb-1">Chapters (from manifest)</div>
          <div className="max-h-80 overflow-auto border border-slate-800 rounded">
            <table className="w-full text-sm">
              <tbody>
                {rows.map(r => (
                  <tr
                    key={r.chapterId}
                    className={`border-b border-slate-800 cursor-pointer ${selected?.chapterId===r.chapterId ? "bg-slate-800/40" : ""}`}
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-2 py-2 w-28 font-mono">{r.chapterId}</td>
                    <td className="px-2 py-2">{r.title}</td>
                    <td className="px-2 py-2 w-16 text-right text-slate-400">{offsets[r.chapterId] ?? r.offset ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">Calibrate offset</div>
          {!selected && <div className="text-slate-400 text-sm">Select a chapter on the left.</div>}
          {selected && (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-mono">{selected.chapterId}</span>
                <span className="opacity-50"> · </span>
                <span>{selected.title}</span>
              </div>
              <div className="flex gap-2 items-end">
                <label className="text-xs text-slate-300">
                  Printed page
                  <input className="block bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm mt-1"
                         value={printed} onChange={e=>setPrinted(e.target.value)} placeholder="e.g., 111" />
                </label>
                <label className="text-xs text-slate-300">
                  PDF viewer page
                  <input className="block bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm mt-1"
                         value={pdf} onChange={e=>setPdf(e.target.value)} placeholder="e.g., 118" />
                </label>
                <button className="btn-primary ml-auto" onClick={save}>Save offset</button>
              </div>
              <div className="text-xs text-slate-400">
                Current offset: <b>{offsets[selected.chapterId] ?? selected.offset ?? 0}</b>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={exportEnv}>Copy JSON for .env</button>
                <a className="btn-secondary" href={`/cbse-pdf/${selected.file}`} target="_blank" rel="noreferrer">Open PDF</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

