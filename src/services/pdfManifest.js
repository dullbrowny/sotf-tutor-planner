// src/services/pdfManifest.js
// Loads /cbse-pdf/manifest.json once, provides helpers:
//   ensurePdfManifest, findPdfByChapterId, getOffsetForChapter, findAnchorPage

let _manifest = null;
let _loaded = false;

const SUBJECT_NORMALIZE = { mathematics: "M", math: "M", science: "S", sci: "S" };
export function subjectCode(s) {
  return SUBJECT_NORMALIZE[String(s || "").toLowerCase()] || "";
}

export async function ensurePdfManifest() {
  if (_loaded) return _manifest || [];
  _loaded = true;
  try {
    const r = await fetch("/cbse-pdf/manifest.json", { cache: "no-store" });
    const m = await r.json();

    // Allow either array or object map
    _manifest = Array.isArray(m) ? m : Object.entries(m).map(([chapterId, v]) => ({ chapterId, ...v }));
  } catch {
    _manifest = [];
  }
  return _manifest;
}

export function findPdfByChapterId(id) {
  if (!_manifest) return null;
  return _manifest.find((x) => x.chapterId === id) || null;
}

/**
 * Sources of truth for offsets, in priority order:
 * 1) localStorage override:  cbse.pageOffsets.v1  { [chapterId]: number }
 * 2) manifest.json entry.offset
 * 3) env override: VITE_CBSE_PAGE_OFFSETS_JSON = '{"10M-CH04":37,"9S-CH02":86}'
 * 4) default 0
 */
export function getOffsetForChapter(chapterId) {
  try {
    const local = JSON.parse(localStorage.getItem("cbse.pageOffsets.v1") || "{}");
    if (Number.isFinite(local[chapterId])) return Number(local[chapterId]);
  } catch {}

  const m = findPdfByChapterId(chapterId);
  if (m && Number.isFinite(m.offset)) return Number(m.offset);

  try {
    const env = import.meta.env.VITE_CBSE_PAGE_OFFSETS_JSON
      ? JSON.parse(import.meta.env.VITE_CBSE_PAGE_OFFSETS_JSON)
      : {};
    if (Number.isFinite(env[chapterId])) return Number(env[chapterId]);
  } catch {}

  return 0;
}

/**
 * Robust anchor lookup:
 * - Accept exact codes ("2.1"), book-coded ("8.1") when the *book* chapter number differs,
 * - Accept suffix-only match (".1") to tolerate 2.1 vs 8.1 mismatches.
 * Returns the *chapter-PDF* page number (1-based) if found, else undefined.
 */
export function findAnchorPage(chapterId, { type, code }) {
  const m = findPdfByChapterId(chapterId);
  if (!m || !Array.isArray(m.anchors) || !type || code == null) return;

  const want = String(code).trim(); // e.g., "2.1"
  const chNoFromId = (() => {
    // expect IDs like "10M-CH04" / "9S-CH02"
    const match = /CH(\d+)/i.exec(chapterId || "");
    return match ? String(parseInt(match[1], 10)) : String(m.chapterNo || "");
  })();

  const dot = want.indexOf(".");
  const wantSuffix = dot >= 0 ? want.slice(dot + 1) : want; // "1"
  const wantWithThisChapter = dot >= 0 ? `${chNoFromId}.${wantSuffix}` : want;

  const candidates = new Set([want, wantWithThisChapter]);
  // Also accept any anchor that ends with ".<suffix>"
  const hit =
    m.anchors.find((a) => a.type === type && candidates.has(String(a.code || "").trim())) ||
    m.anchors.find(
      (a) =>
        a.type === type &&
        String(a.code || "").trim().endsWith(`.${wantSuffix}`) &&
        // prefer same chapter number if present
        (String(a.code || "").trim().startsWith(`${chNoFromId}.`) || true)
    );

  return Number.isFinite(hit?.page) ? Number(hit.page) : undefined;
}

