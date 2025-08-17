// src/services/manifest.js
// Single source of truth for reading the enriched CBSE manifest and common helpers.

const CBSE_BASE = import.meta.env.VITE_CBSE_PDF_BASE || "/cbse-pdf";

// ---- internal cache ----
let _manifest = null;              // Array of chapter objects
let _manifestById = new Map();     // chapterId -> chapter
let _loaded = false;

// Typical anchor names to fall back to when a chapter has no anchors in the manifest
const FALLBACK_TOPICS = [
  "Exercises",
  "Intext Questions",
  "Try These",
  "Examples",
  "Keywords",
  "Summary",
];

// ---------- load / cache ----------
export async function ensureManifest() {
  if (_loaded && Array.isArray(_manifest)) return _manifest;

  const url = `${CBSE_BASE}/manifest.enriched.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load manifest: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Manifest is not an array.");
  }

  _manifest = data;
  _manifestById = new Map(data.map((row) => [row.chapterId, row]));
  _loaded = true;
  return _manifest;
}

// ---------- lookups ----------
export async function getGrades() {
  const m = await ensureManifest();
  const set = new Set(m.map((x) => x.grade).filter((g) => g != null));
  return [...set].sort((a, b) => a - b);
}

export async function getSubjectsForGrade(grade) {
  const m = await ensureManifest();
  const set = new Set(
    m.filter((x) => x.grade === Number(grade)).map((x) => x.subject).filter(Boolean)
  );
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function chapterIdToPretty(chapterId) {
  // Example: "9M-CH01" -> "9M · CH01"
  if (!chapterId) return "";
  return chapterId.replace("-", " · ");
}

export async function getChaptersForGradeSubject(grade, subject) {
  const m = await ensureManifest();
  return m
    .filter((x) => x.grade === Number(grade) && x.subject === subject)
    .map((x) => ({
      value: x.chapterId,
      chapterId: x.chapterId,
      file: x.file,
      label: `${chapterIdToPretty(x.chapterId)} • ${x.title ?? ""}`.trim(),
      title: x.title,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getChapterById(chapterId) {
  await ensureManifest();
  return _manifestById.get(chapterId) || null;
}

export async function getTopicsForChapter(chapterId) {
  const row = await getChapterById(chapterId);
  if (!row) return [];

  // Prefer real anchors; otherwise fall back to a small default list
  const names = Array.isArray(row.anchors) && row.anchors.length
    ? Array.from(new Set(row.anchors.map(a => a?.name).filter(Boolean)))
    : FALLBACK_TOPICS;

  // <-- Return plain strings so consumers can render <option>{t}</option>
  return names;
}

// ---------- URLs ----------
export function buildLocalPdfUrl(input, { page = 1, zoom = "page-width" } = {}) {
  const file =
    typeof input === "string"
      ? _manifestById.get(input)?.file
      : input?.file;

  if (!file) return null;

  // Ensure no leading slash double-ups
  const filePath = file.startsWith("/") ? file.slice(1) : file;
  return `${CBSE_BASE}/${filePath}#page=${page}&zoom=${encodeURIComponent(zoom)}`;
}

export { CBSE_BASE };

