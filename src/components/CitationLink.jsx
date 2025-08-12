import React from "react";

/**
 * Accepts either a citation object or a chapterRef:
 * {
 *   title?, chapterName?, chapterId?, url?/href?,
 *   page?, p?
 * }
 */
export default function CitationLink({ refObj, className = "" }) {
  if (!refObj) return null;

  const labelBase =
    refObj.title ||
    refObj.chapterName ||
    "Textbook";

  const page = Number(refObj.page ?? refObj.p) || undefined;

  let href = refObj.url || refObj.href || "";

  // If no URL but we have a chapterId, try to construct one from env/base.
  if (!href && refObj.chapterId) {
    const base = import.meta.env.VITE_CBSE_PDF_BASE || "/cbse-pdf";
    href = `${base}/${refObj.chapterId}.pdf`;
  }

  // Add page parameter for PDFs if missing.
  if (href) {
    const isPdf = /\.pdf($|\?)/i.test(href);
    const alreadyHasPage = /[#?]page=\d+/.test(href);
    if (isPdf && page && !alreadyHasPage) {
      // Google Drive/Docs viewers tend to prefer ?page=, direct PDFs prefer #page=
      const useQuery = /google\.com|drive\.google\.com|docs\.google\.com/.test(href);
      href = href + (href.includes("#") || (href.includes("?") && !useQuery)
        ? `&page=${page}`
        : (useQuery ? `?page=${page}` : `#page=${page}`));
    }
  }

  const label = `Source: ${labelBase}${page ? ` · p.${page}` : ""}`;

  return (
    <a
      className={`text-xs inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 underline ${className}`}
      href={href || "#"}
      target="_blank"
      rel="noreferrer"
      title={label}
    >
      {label}
    </a>
  );
}

