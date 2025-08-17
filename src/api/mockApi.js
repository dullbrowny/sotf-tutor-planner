
// src/api/mockApi.js
// Central helpers for mock CBSE linking + small utils.
// Keeps api.cbse.linkToChapter() synchronous while lazily prefetching the manifest.

export const version = "mock-2";
export function ping() { return "ok"; }

// ---------- Manifest (lazy) ----------
let __manifest = null;               // array or null
let __manifestFetchStarted = false;

function getBase() {
  return import.meta.env.VITE_CBSE_PDF_BASE || "/cbse-pdf";
}

function prefetchManifest() {
  if (typeof window === "undefined") return;       // no-op on SSR
  if (__manifest || __manifestFetchStarted) return;
  __manifestFetchStarted = true;
  const url = `${getBase()}/manifest.json`;
  // Fire-and-forget; we keep linkToChapter() synchronous.
  fetch(url, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .then((json) => { __manifest = Array.isArray(json) ? json : []; })
    .catch(() => { __manifest = []; });
}
// kick it off once on module load
prefetchManifest();

function findInManifest(chapterId) {
  if (!Array.isArray(__manifest)) return null;
  return __manifest.find((e) => e.chapterId === chapterId) || null;
}

// ---------- Hash helper ----------
function setPdfPageParam(url, page) {
  if (!Number.isFinite(page) || page < 1) return url;
  const [base, hash = ""] = String(url).split("#");
  const params = new URLSearchParams(hash.includes("=") ? hash : "");
  params.set("page", String(page)); // ensure a SINGLE #page
  const h = params.toString();
  return h ? `${base}#${h}` : base;
}

// ---------- Offsets ----------
function parseEnvOffsets() {
  try {
    const raw = import.meta.env.VITE_CBSE_PAGE_OFFSETS_JSON;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function getLocalOffsets() {
  try {
    const raw = localStorage.getItem("cbse.pageOffsets.v1");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
// printed->physical offset with priorities: localStorage > manifest.offset > env JSON > 0
function getOffsetForChapter(chapterId) {
  const local = getLocalOffsets();
  if (Number.isFinite(local[chapterId])) return Number(local[chapterId]);

  const entry = findInManifest(chapterId);
  if (entry && Number.isFinite(entry.offset)) return Number(entry.offset);

  const env = parseEnvOffsets();
  if (Number.isFinite(env[chapterId])) return Number(env[chapterId]);

  return 0;
}

// ---------- Anchors (fuzzy: "2.1" ≈ "8.1") ----------
function findAnchorPage(chapterId, anchor) {
  const entry = findInManifest(chapterId);
  if (!entry || !Array.isArray(entry.anchors) || !anchor || !anchor.type) return;

  const want = String(anchor.code ?? "").trim(); // e.g., "2.1" (or empty)
  const chNoFromId = (() => {
    const m = /CH(\d+)/i.exec(chapterId || "");
    return m ? String(parseInt(m[1], 10)) : "";
  })();

  const dot = want.indexOf(".");
  const suffix = dot >= 0 ? want.slice(dot + 1) : want; // "1" (or "2.1" if no dot)
  const wantWithThisChapter = dot >= 0 ? `${chNoFromId}.${suffix}` : want;

  const candidates = new Set([want, wantWithThisChapter]);

  const hit =
    entry.anchors.find((a) => a.type === anchor.type && candidates.has(String(a.code || "").trim())) ||
    entry.anchors.find((a) => a.type === anchor.type && String(a.code || "").trim().endsWith(`.${suffix}`));

  return Number.isFinite(hit?.page) ? Number(hit.page) : undefined;
}

// ---------- Public API ----------
export const api = {
  cbse: {
    /**
     * Build a stable PDF link for a chapter (used by chapterRef / citations).
     * - Resolves *local* /cbse-pdf/sources/** first, then remote url/href as fallback.
     * - Appends "#page=" using Anchor ⇒ Offset ⇒ Page 1.
     * - Synchronous by design (manifest prefetch runs in background).
     */
    linkToChapter({ chapterId, file, url, href, page, anchor }) {
      const base = getBase();

      // ---- LOCAL FIRST ----
      let out = "";
      if (chapterId) {
        const m = findInManifest(chapterId);
        if (m?.file) out = `${base}/${m.file}`;
      }
      if (!out && file) out = `${base}/${file}`;

      // ---- REMOTE ONLY IF LOCAL MISSING ----
      if (!out) out = url || href || "";

      if (!out) return "";

      // Decide target page: anchor > offset math > 1 (for local chapter PDFs)
      let targetPage;

      if (anchor && chapterId) {
        const ap = findAnchorPage(chapterId, anchor);
        if (Number.isFinite(ap)) targetPage = ap;
      }
      if (!targetPage && page && chapterId) {
        const off = getOffsetForChapter(chapterId);  // 0 if none
        const local = Number(page) - (Number(off) || 0);
        if (Number.isFinite(local) && local >= 1) targetPage = local;
      }
      if (!targetPage && /\.pdf($|\?)/i.test(out) && /\/cbse-pdf\/.+\/sources\//.test(out)) {
        targetPage = 1;
      }

      return setPdfPageParam(out, targetPage);
    },

    // Optional helpers for debugging from DevTools
    _prefetch() { prefetchManifest(); },
    _debugState() { return { hasManifest: Array.isArray(__manifest), count: __manifest?.length ?? 0, started: __manifestFetchStarted }; },
  },
};

export default api;

