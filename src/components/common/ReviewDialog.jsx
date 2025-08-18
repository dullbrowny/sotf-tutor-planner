// src/components/common/ReviewDialog.jsx
import React from "react";
import Button from "../../ui/Button.jsx";
import { getBlobURL } from "../../lib/blobs.js";

export default function ReviewDialog({ open, onClose, onConfirm, text, attachments = [] }) {
  const [urls, setUrls] = React.useState({}); // id -> objectURL

  React.useEffect(() => {
    let live = true;
    (async () => {
      const map = {};
      for (const a of attachments) {
        map[a.id] = await getBlobURL(a.id);
      }
      if (live) setUrls(map);
    })();
    return () => {
      live = false;
      Object.values(urls).forEach(u => u && URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attachments.map(a => a.id).join(",")]);

  if (!open) return null;

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000
    }}>
      <div className="card" style={{ width:"min(90vw, 720px)", maxHeight:"85vh", overflow:"auto", padding:16 }}>
        <div className="text-lg font-semibold mb-2">Review your submission</div>

        <div className="mb-3">
          <div className="text-xs opacity-70 mb-1">Text answer</div>
          <div className="p-3 rounded border border-slate-700 bg-slate-900 whitespace-pre-wrap text-sm">
            {text?.trim() ? text : <em className="opacity-60">No text</em>}
          </div>
        </div>

        <div className="text-xs opacity-70 mb-1">Attachments</div>
        <div className="space-y-3">
          {attachments.length === 0 && <div className="text-sm opacity-70">No attachments</div>}
          {attachments.map(a => {
            const kind = a.type.split("/")[0];
            const url = urls[a.id];
            return (
              <div key={a.id} className="p-2 rounded border border-slate-700">
                <div className="text-xs mb-1">{a.name} · {a.type} · {Math.round(a.size/1024)} KB</div>
                {!url && <div className="text-xs opacity-70">Loading…</div>}
                {url && kind === "audio" && <audio controls src={url} style={{ width:"100%" }} />}
                {url && kind === "video" && <video controls src={url} style={{ width:"100%", maxHeight:360 }} />}
                {url && kind === "image" && <img src={url} alt={a.name} style={{ maxWidth:"100%", borderRadius:8 }} />}
                {url && !["audio","video","image"].includes(kind) && <a className="underline" href={url} target="_blank" rel="noreferrer">Open</a>}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Keep editing</Button>
          <Button onClick={onConfirm}>Submit</Button>
        </div>
      </div>
    </div>
  );
}

