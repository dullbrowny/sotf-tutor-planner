export default function CitationLink({ refObj, className = "" }) {
  if (!refObj) return null;
  const { url, page, chapterName } = refObj;
  const label = chapterName ? `${chapterName}${page ? ` · p.${page}` : ''}` : (page ? `p.${page}` : 'Source');
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={
        "inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 " +
        "text-sky-300 hover:text-sky-200 " + className
      }
      title="Open NCERT source (ePathshala)"
    >
      Source: {label}
    </a>
  );
}

