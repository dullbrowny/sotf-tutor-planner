
// Lightweight client-side retrieval against precomputed index.json
const RAG_INDEX_URL = "/cbse-pdf/rag/index.json";

let _index = null;
export async function ensureRagIndex() {
  if (_index) return _index;
  try {
    const r = await fetch(RAG_INDEX_URL, { cache: "no-store" });
    _index = await r.json();
  } catch { _index = []; }
  return _index;
}

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot=0, na=0, nb=0;
  for (let i=0;i<a.length;i++){ const x=a[i], y=b[i]; dot+=x*y; na+=x*x; nb+=y*y; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) + 1e-8);
}

export function rankByKeyword(chunks, q, k=8) {
  const qq = String(q||"").toLowerCase().split(/\W+/).filter(Boolean);
  return chunks
    .map(c => {
      const t = (c.text||"").toLowerCase();
      let s = 0; for (const w of qq) if (t.includes(w)) s++;
      return [s, c];
    })
    .sort((a,b)=>b[0]-a[0])
    .slice(0,k)
    .map(([_,c])=>c);
}

export async function retrieve({ query, chapterId, subject, grade, topK=6 }) {
  const idx = await ensureRagIndex();
  let pool = idx;
  if (chapterId) pool = pool.filter(c => c.chapterId === chapterId);
  // TODO: could also filter by grade/subject prefix in chapterId
  // Prefer vector search if vectors exist
  if (pool.length && pool[0].vector && Array.isArray(pool[0].vector)) {
    // For the PoC, use the same embed API for the query if available, else keyword fallback
    try {
      const res = await fetch("https://api.together.xyz/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model: import.meta.env.VITE_TOGETHER_EMBED_MODEL || "sentence-transformers/all-MiniLM-L6-v2", input: [query] })
      });
      const data = await res.json();
      const qvec = data?.data?.[0]?.embedding;
      if (Array.isArray(qvec)) {
        const ranked = pool
          .map(c => [cosine(qvec, c.vector), c])
          .sort((a,b)=>b[0]-a[0])
          .slice(0, topK)
          .map(([_,c]) => c);
        return ranked;
      }
    } catch {}
  }
  return rankByKeyword(pool, query, topK);
}
