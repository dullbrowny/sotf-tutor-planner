import React from "react";
import { buildLocalPdfUrl, getChapterById } from "../services/manifest";

export default function PDFPreview({ chapterId, url, expanded, onToggle }) {
  const [href, setHref] = React.useState(url || "");
  React.useEffect(() => {
    (async () => {
      if (!chapterId) { setHref(""); return; }
      const rec = await getChapterById(chapterId);
      setHref(buildLocalPdfUrl(rec, { page: 1, zoom: "page-width" }));
    })();
  }, [chapterId]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="title">Inline PDF Preview</div>
        <div className="flex gap-2">
          {href ? <a className="btn btn-outline" href={href} target="_blank" rel="noreferrer">Open</a> : null}
          <button className="btn" onClick={onToggle}>{expanded ? "Collapse" : "Expand"}</button>
        </div>
      </div>
      <div className="card-body">
        {!href ? (
          <div className="muted">Select a chapter to preview its PDF.</div>
        ) : (
          <iframe
            key={href}
            title="inline-pdf"
            src={href}
            className={`w-full bg-slate-900 rounded ${expanded ? "h-[540px]" : "h-[220px]"}`}
          />
        )}
      </div>
    </div>
  );
}

