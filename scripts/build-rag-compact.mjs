import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "public/cbse-pdf";
const ENRICHED = path.join(OUT_DIR, "manifest.enriched.json");
const RAG_DIR  = path.join(OUT_DIR, "rag");
const RAG_FILE = path.join(RAG_DIR, "index.json");

if (!fs.existsSync(ENRICHED)) {
  console.error(`❌ Missing ${ENRICHED}. Generate it locally first.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(ENRICHED, "utf8"));
let entries = [];
if (Array.isArray(raw)) entries = raw;
else if (raw?.chapters) {
  entries = Array.isArray(raw.chapters)
    ? raw.chapters
    : Object.entries(raw.chapters).map(([chapterId, v]) => ({ chapterId, ...v }));
} else {
  entries = Object.entries(raw).map(([k, v]) => ({ chapterId: v?.chapterId || k, ...v }));
}

function compact(e) {
  const id = String(e.chapterId || e.id || e.code || "").trim();
  const file = String(e.file || e.pdf || e.path || "").trim();
  const offset = Number(e.offset || 0);
  const anchors = Array.isArray(e.anchors)
    ? e.anchors.map(a => ({
        type: String(a.type || a.kind || "").slice(0, 24),
        code: String(a.code || a.id || a.title || "").slice(0, 120),
        page: Number(a.page || a.p || 0),
      }))
    : [];
  if (!id || !file) return null;
  return { chapterId: id, file, offset, anchors };
}

const list = entries.map(compact).filter(Boolean);
const chapters = Object.fromEntries(list.map(e => [e.chapterId, e]));

fs.mkdirSync(RAG_DIR, { recursive: true });
fs.writeFileSync(RAG_FILE, JSON.stringify({ list, chapters }), "utf8");

const bytes = fs.statSync(RAG_FILE).size;
console.log(`✅ wrote ${RAG_FILE} — ${(bytes/1e6).toFixed(2)} MB — ${list.length} chapters`);
