
// src/components/CitationLink.jsx
import React, { useEffect, useState } from "react";
import {
  ensurePdfManifest,
  findPdfByChapterId,
  getOffsetForChapter,
  findAnchorPage,
} from "../services/pdfManifest";

/**
 * refObj:
 * {
 *   chapterId?,                  // preferred; e.g. "9S-CH02"
 *   file?,                       // fallback; e.g. "sources/9S/CH02.pdf"
 *   url?, href?,                 // REMOTE (ignored unless allowRemote)
 *   allowRemote?: boolean,       // set true to allow remote fallback
 *   chapterName?, title?,        // used to auto-guess chapterId if missing
 *   page?,                       // book-absolute printed page number
 *   anchor?: { type, code }      // e.g., {type:"example", code:"2.1"}
 * }
 */

const FORCE_LOCAL = true; // hard-on for your PoC

function setPdfPageParam(url, page) {
  if (!Number.isFinite(page) || page < 1) return url;
  const [base, hash = ""] = String(url).split("#");
  const params = new URLSearchParams(hash.includes("=") ? hash : "");
  params.set("page", String(page));
  const h = params.toString();
  return h ? `${base}#${h}` : base;
}

// Try to find a chapter entry in manifest by fuzzy title match
function guessChapterIdByTitle(manifest, titleLike) {
  if (!titleLike) return null;
  const q = String(titleLike).toLowerCase().replace(/\s+/g, " ").trim();
  if (!q) return null;

  // score by longest title inclusion
  let best = null;
  let bestLen = 0;
  for (const e of manifest) {
    const t = String(e.title || "").toLowerCase();
    if (!t) continue;
    if (t.includes(q) || q.includes(t)) {
      const len = Math.max(t.length, q.length);
      if (len > bestLen) { best = e; bestLen = len; }
    }
  }
  return best?.chapterId || null;
}

async function buildPdfHref(refObj) {
  if (!refObj) return "";

  const base = import.meta.env.VITE_CBSE_PDF_BASE || "/cbse-pdf";
  await ensurePdfManifest();

  // Load manifest array via ensurePdfManifest()
  const manifest = await (async () => {
    // ensurePdfManifest already cached it; we can re-read via findPdfByChapterId,
    // but we also want the raw list for fuzzy guess; fetch it once more directly:
    try {
      const r = await fetch("/cbse-pdf/manifest.json", { cache: "no-store" });
      const m = await r.json();
      return Array.isArray(m) ? m : [];
    } catch { return []; }
  })();

  // --- Resolve chapterId (explicit → fuzzy by title) ---
  let chapterId = refObj.chapterId || null;
  if (!chapterId) {
    const t = refObj.chapterName || refObj.title || "";
    chapterId = guessChapterIdByTitle(manifest, t);
    if (!chapterId) {
      // last-ditch: if a single entry matches by file name hint in refObj.file
      if (refObj.file && /CH\d+/i.test(refObj.file)) {
        const m = manifest.find(e => String(e.file || "").endsWith(refObj.file));
        if (m) chapterId = m.chapterId;
      }
    }
  }

  // --- Prefer LOCAL path ---
  let urlLocal = "";
  if (chapterId) {
    const m = findPdfByChapterId(chapterId);
    if (m?.file) urlLocal = `${base}/${m.file}`;
  }
  if (!urlLocal && refObj.file) {
    urlLocal = `${base}/${refObj.file}`;
  }

  // Decide whether remote is even allowed
  const allowRemote = Boolean(refObj.allowRemote) && !FORCE_LOCAL;

  // Final URL preference: LOCAL → (optional) REMOTE → # (disabled)
  let url = urlLocal || (allowRemote ? (refObj.url || refObj.href || "") : "");
  if (!url) {
    console.warn("[CitationLink] No local PDF found and remote disabled.", { refObj, guessedChapterId: chapterId });
    return "#";
  }

  // ---- Page selection: anchor > offset math > 1 (for chapter PDFs) ----
  let targetPage;

  if (refObj.anchor && chapterId) {
    const ap = findAnchorPage(chapterId, refObj.anchor);
    if (Number.isFinite(ap)) targetPage = ap;
  }

  if (!targetPage && refObj.page && chapterId) {
    const off = getOffsetForChapter(chapterId); // 0 if missing
    const local = Number(refObj.page) - (Number(off) || 0);
    if (Number.isFinite(local) && local >= 1) targetPage = local;
  }

  if (!targetPage && /\.pdf($|\?)/i.test(url) && /\/cbse-pdf\/.+\/sources\//.test(url)) {
    targetPage = 1;
  }

  const finalUrl = setPdfPageParam(url, targetPage);
  if (/ncert\.nic\.in|textbook\.pdf|\.nic\.in/i.test(finalUrl)) {
    console.warn("[CitationLink] Remote NCERT link used (check mapping).", { finalUrl, refObj, chapterId });
  }
  return finalUrl;
}

export default function CitationLink({ refObj, className = "" }) {
  const [href, setHref] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const finalUrl = await buildPdfHref(refObj);
      if (alive) setHref(finalUrl);
    })();
    return () => { alive = false; };
  }, [JSON.stringify(refObj)]);

  if (!refObj) return null;
  const labelBase = refObj.title || refObj.chapterName || "Textbook";
  const label = `Source: ${labelBase}${refObj.page ? ` · p.${refObj.page}` : ""}${
    refObj.anchor ? ` · ${refObj.anchor.type}${refObj.anchor.code ? " " + refObj.anchor.code : ""}` : ""
  }`;

  return (
    <a
      className={`text-xs inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 underline ${className}`}
      href={href || "#"}
      target="_blank"
      rel="noreferrer"
      title={labelBase}
    >
      {label}
    </a>
  );
}


