
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

let pdfjsLib;
async function loadPdfJs() {
  // Prefer legacy build for Node, then fall back
  try {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (_) {
    pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
  }

  // Try to set worker (optional in Node; safe to skip if not found)
  try {
    const pkgPath = require.resolve("pdfjs-dist/package.json");
    const baseDir = path.dirname(pkgPath);
    let workerPath;
    const candidates = [
      path.join(baseDir, "legacy/build/pdf.worker.min.js"),
      path.join(baseDir, "build/pdf.worker.min.js")
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) { workerPath = c; break; }
    }
    if (workerPath) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
    }
  } catch (e) {
    // Non-fatal
    console.warn("[PDFJS] Worker not set (ok in Node):", e?.message);
  }
}

function resolvePdfJsAssets() {
  try {
    const pkgPath = require.resolve("pdfjs-dist/package.json");
    const baseDir = path.dirname(pkgPath);
    const standardFonts = path.join(baseDir, "standard_fonts/");
    const cmaps = path.join(baseDir, "cmaps/");
    const cfg = {};
    if (fs.existsSync(standardFonts)) cfg.standardFontDataUrl = pathToFileURL(standardFonts).href;
    if (fs.existsSync(cmaps)) { cfg.cMapUrl = pathToFileURL(cmaps).href; cfg.cMapPacked = true; }
    return cfg;
  } catch (e) {
    return {};
  }
}

const ROOT = process.cwd();
const MANIFEST = path.resolve(ROOT, "public/cbse-pdf/manifest.json");
const SOURCES_DIR = path.resolve(ROOT, "public/cbse-pdf/sources");
const OUT_DIR = path.resolve(ROOT, "public/cbse-pdf/rag");
const OUT_INDEX = path.join(OUT_DIR, "index.json");

const KEY = process.env.TOGETHER_API_KEY || "";
const EMBED_MODEL = process.env.TOGETHER_EMBED_MODEL || "intfloat/multilingual-e5-large-instruct";
const DISABLE_EMBED = String(process.env.TOGETHER_DISABLE_EMBED || "0") === "1";
const MAX_CHARS = Math.max(300, parseInt(process.env.RAG_EMBED_MAX_CHARS || "1500", 10));

const EMBED_API = "https://api.together.xyz/v1/embeddings";

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf-8")); }
function writeJson(p, o) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 2)); }
function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

function smartChunks(text, maxChars = MAX_CHARS) {
  const t = norm(text);
  if (!t) return [];
  if (t.length <= maxChars) return [t];
  const out = [];
  let start = 0;
  const len = t.length;
  while (start < len) {
    let end = Math.min(start + maxChars, len);
    let cut = end;
    for (let k = end; k > start + Math.floor(maxChars * 0.6); k--) {
      const ch = t[k];
      if (ch === "." || ch === "!" || ch === "?" || ch === ";" || ch === "\n" || ch === " ") { cut = k; break; }
    }
    out.push(t.slice(start, cut).trim());
    start = cut;
  }
  return out.filter(Boolean);
}

async function readPdfPages(absPdf) {
  if (!pdfjsLib) await loadPdfJs();
  const opts = resolvePdfJsAssets();
  const data = new Uint8Array(fs.readFileSync(absPdf));
  const task = pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, ...opts });
  const doc = await task.promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map(it => it.str || "").join(" ");
    pages.push(norm(text));
  }
  try { await doc.destroy(); } catch {}
  return pages;
}

async function embedBatch(texts) {
  if (DISABLE_EMBED || !KEY) return texts.map(() => null);
  const payload = { model: EMBED_MODEL, input: texts };
  try {
    const res = await fetch(EMBED_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "?");
      console.warn(`[RAG] Embeddings API non-OK ${res.status}: ${t.slice(0,200)}`);
      return texts.map(() => null);
    }
    const json = await res.json();
    const arr = json?.data || [];
    return texts.map((_, i) => arr[i]?.embedding || null);
  } catch (e) {
    console.warn("[RAG] Embeddings API failed; continuing keyword-only.", e);
    return texts.map(() => null);
  }
}

function resolvePdfPath(entryFile) {
  const f = String(entryFile || "").replace(/^\/+/, "");
  if (f.startsWith("sources/")) return path.resolve(ROOT, "public/cbse-pdf", f);
  return path.resolve(SOURCES_DIR, f);
}
function deriveChapterId(e) {
  if (e.chapterId) return String(e.chapterId);
  const base = path.basename(String(e.file || ""), ".pdf");
  return base || "unknown";
}

async function main() {
  if (!fs.existsSync(MANIFEST)) throw new Error(`Manifest not found at ${MANIFEST}`);
  const list = readJson(MANIFEST);
  if (!Array.isArray(list) || list.length === 0) throw new Error("Manifest is empty or not an array");
  console.log(`Building RAG from ${list.length} manifest entries…`);

  const index = [];
  for (const e of list) {
    const chapterId = deriveChapterId(e);
    const absPdf = resolvePdfPath(e.file);
    if (!fs.existsSync(absPdf)) { console.warn(`[RAG] Missing PDF for ${chapterId}: ${absPdf}`); continue; }

    console.log(`• Reading ${chapterId} ← ${path.relative(ROOT, absPdf)}`);
    const pages = await readPdfPages(absPdf);
    if (!pages || pages.length === 0) { console.warn(`[RAG] No text extracted for ${chapterId}`); continue; }

    const chunks = [];
    for (let i = 0; i < pages.length; i++) {
      const pageNo = i + 1;
      const text = pages[i];
      if (!text) continue;
      const parts = smartChunks(text, MAX_CHARS);
      for (const part of parts) chunks.push({ text: part, pdfPage: pageNo });
    }

    const BATCH = 8;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const embeds = await embedBatch(slice.map(c => c.text));
      for (let j = 0; j < slice.length; j++) {
        const c = slice[j];
        index.push({
          id: `${chapterId}:${i + j + 1}`,
          chapterId,
          page: c.pdfPage,
          text: c.text,
          vector: embeds ? embeds[j] : null
        });
      }
      process.stdout.write(`  - chunks ${i + 1}-${Math.min(i + BATCH, chunks.length)}\r`);
    }
    process.stdout.write("\n");
  }

  writeJson(OUT_INDEX, { passages: index });
  console.log(`\n✅ RAG index written to ${path.relative(ROOT, OUT_INDEX)} (${index.length} chunks, vectors: ${index.filter(x => x.vector).length})`);
}

main().catch(err => { console.error(err); process.exit(1); });
