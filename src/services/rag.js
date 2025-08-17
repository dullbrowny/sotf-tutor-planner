// src/services/rag.js
// Zero-dependency client RAG (keyword scoring over /cbse-pdf/rag/index.json)

let _ragIndex = null;
async function loadIndex() {
  if (_ragIndex) return _ragIndex;
  const url = (import.meta.env.VITE_CBSE_PDF_BASE || "/cbse-pdf") + "/rag/index.json";
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`RAG index not found at ${url}`);
  _ragIndex = await res.json();
  return _ragIndex;
}

function score(text, queryTerms) {
  const t = text.toLowerCase();
  let s = 0;
  for (const q of queryTerms) {
    if (!q) continue;
    const w = String(q).toLowerCase().trim();
    if (!w) continue;
    const count = t.split(w).length - 1; // basic term frequency
    s += count * (w.length >= 6 ? 2 : 1);
  }
  return s;
}

function topMatches(chunks, query, limit = 5) {
  const terms = String(query || "").split(/\W+/).filter(Boolean);
  const withScores = chunks.map((c) => ({ ...c, __score: score(c.text || "", terms) }));
  withScores.sort((a, b) => b.__score - a.__score);
  return withScores.slice(0, limit).filter((c) => c.__score > 0);
}

export async function getChapterContext(chapterId, maxChars = 2400) {
  const idx = await loadIndex();
  const chunks = (idx.byChapter && idx.byChapter[chapterId]) || [];
  const sorted = [...chunks].sort((a, b) => (a.page || 0) - (b.page || 0));
  let out = "";
  for (const c of sorted) {
    const t = (c?.text || "").replace(/\s+/g, " ").trim();
    if (!t) continue;
    if (out.length + t.length + 1 > maxChars) {
      out += " " + t.slice(0, Math.max(0, maxChars - out.length));
      break;
    }
    out += (out ? " " : "") + t;
  }
  return out.trim();
}

export async function enrichLOs({ chapterId, los = [], topicLabel }) {
  const idx = await loadIndex();
  const chunks = (idx.byChapter && idx.byChapter[chapterId]) || idx.chunks || [];
  if (!chunks.length) return los;

  const enhanced = los.map((lo) => {
    const q = `${topicLabel || ""} ${lo}`.trim();
    const hits = topMatches(chunks, q, 3);
    if (!hits.length) return lo;
    const snippets = hits.map((h) => (h.text || "").slice(0, 180).replace(/\s+/g, " ").trim());
    return `${lo} — e.g., ${snippets.join(" / ")}`;
  });

  return enhanced;
}

export async function generateMicroplan({ chapterId, los = [], topicLabel }) {
  const idx = await loadIndex();
  const chunks = (idx.byChapter && idx.byChapter[chapterId]) || idx.chunks || [];
  const baseText = (chunks[0]?.text || "").replace(/\s+/g, " ").slice(0, 260);

  return {
    title: `Microplan • ${chapterId}${topicLabel ? ` • ${topicLabel}` : ""}`,
    overview: baseText || "Overview not found in RAG index.",
    steps: [
      { type: "Hook", minutes: 5, detail: `Quick prompt about: ${topicLabel || los[0] || "today's concept"}` },
      { type: "Teach", minutes: 10, detail: `Explain core idea. Use example from text (see: ${chapterId}).` },
      { type: "Guided Practice", minutes: 10, detail: `Work through 1–2 problems tied to: ${los.slice(0,2).join("; ")}` },
      { type: "Check for Understanding", minutes: 5, detail: "1-minute exit ticket on the main idea." },
    ],
  };
}

// Back-compat default export
export default { enrichLOs, generateMicroplan, getChapterContext };

