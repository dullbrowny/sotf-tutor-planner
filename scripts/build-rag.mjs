#!/usr/bin/env node
// Build a lightweight retrieval index from local chapter PDFs.
//
// Fixes:
// - Hard-chunk text so each embedding input ≤ model context (default 1500 chars ~ <=512 tokens)
// - Graceful fallback to keyword-only if embeddings unavailable/disabled
//
// Env knobs:
//   TOGETHER_API_KEY=...                     (server key)
//   TOGETHER_EMBED_MODEL=intfloat/multilingual-e5-large-instruct   (or any enabled embedding model)
//   TOGETHER_DISABLE_EMBED=1                 (force keyword-only)
//   RAG_EMBED_MAX_CHARS=1500                 (per-chunk char cap)

import fs from "node:fs";
import path from "node:path";

// --- robust pdf-parse import (bypass package entry that tries to read test files) ---
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pdfParsePath = require.resolve("pdf-parse/lib/pdf-parse.js");
const { default: pdf } = await import(pdfParsePath);

// ------------ config ------------
const ROOT = "public/cbse-pdf";
const MANIFEST = path.join(ROOT, "manifest.json");
const OUT_DIR = path.join(ROOT, "rag");
const OUT_INDEX = path.join(OUT_DIR, "index.json");

const EMBED_API = "https://api.together.xyz/v1/embeddings";
const EMBED_MODEL =
  process.env.TOGETHER_EMBED_MODEL || "intfloat/multilingual-e5-large-instruct";
const KEY = process.env.TOGETHER_API_KEY || "";
const DISABLE_EMBED = /^(1|true|yes)$/i.test(process.env.TOGETHER_DISABLE_EMBED || "");
const MAX_CHARS = Math.max(400, Number(process.env.RAG_EMBED_MAX_CHARS || 1500)); // ~<=512 tokens

// ------------ utils ------------
function readJson(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function writeJson(p, o){ fs.writeFileSync(p, JSON.stringify(o,null,2)); }
function abs(p){ return path.resolve(p); }
function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

// Chunk text on sentence-ish boundaries, max MAX_CHARS each
function smartChunks(text, maxChars = MAX_CHARS) {
  const t = norm(text);
  if (!t) return [];
  if (t.length <= maxChars) return [t];

  const out = [];
  let start = 0;
  const len = t.length;
  while (start < len) {
    let end = Math.min(start + maxChars, len);
    // try to break on a sentence boundary or whitespace near the end
    let cut = t.lastIndexOf(". ", end);
    if (cut <= start + Math.floor(maxChars * 0.6)) {
      cut = t.lastIndexOf(" ", end);
    }
    if (cut <= start) cut = end;
    out.push(t.slice(start, cut).trim());
    start = cut + 1;
  }
  return out.filter(Boolean);
}

// Read a PDF and return an array of chunks (<=MAX_CHARS). Prefer per-page splits; fallback to hard chunks.
async function readPdfChunks(absPdf) {
  const buf = new Uint8Array(fs.readFileSync(absPdf));

  // Use pdf-parse; its `text` is usually joined with \f between pages.
  const res = await pdf(buf, {
    pagerender: (pg) =>
      pg.getTextContent().then(tc => tc.items.map(i => i.str || "").join(" "))
  });

  let raw = String(res.text || "");
  let byPage = raw.split("\f").map(norm).filter(Boolean);

  // If the splitter failed (common for some PDFs), or any page is still too long, re-chunk the whole text.
  const anyTooLong = byPage.some(p => p.length > MAX_CHARS);
  if (!byPage.length || byPage.length === 1 || anyTooLong) {
    byPage = smartChunks(raw, MAX_CHARS);
  } else {
    // also re-chunk long pages individually
    const fixed = [];
    for (const p of byPage) {
      if (p.length > MAX_CHARS) fixed.push(...smartChunks(p, MAX_CHARS));
      else fixed.push(p);
    }
    byPage = fixed;
  }
  return byPage;
}

async function embedBatch(texts) {
  if (DISABLE_EMBED || !KEY) return texts.map(() => null); // keyword-only
  try {
    const res = await fetch(EMBED_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "?");
      console.warn(`[RAG] Embedding API ${res.status}: ${t.slice(0,180)} — falling back to keyword only.`);
      return texts.map(() => null);
    }
    const data = await res.json();
    return (data?.data || []).map(d => d.embedding || null);
  } catch (err) {
    console.warn(`[RAG] Embedding error: ${err.message} — falling back to keyword only.`);
    return texts.map(() => null);
  }
}

// ------------ main ------------
async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(MANIFEST)) {
    console.error(`Missing ${MANIFEST}`);
    process.exit(2);
  }

  const manifest = readJson(MANIFEST);
  const index = [];
  const BATCH = 8;

  for (const e of manifest) {
    const absPdf = abs(path.join(ROOT, e.file));
    if (!fs.existsSync(absPdf)) continue;

    const chunks = await readPdfChunks(absPdf); // already <= MAX_CHARS
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const embeds = await embedBatch(slice);
      for (let j = 0; j < slice.length; j++) {
        index.push({
          id: `${e.chapterId}:${i + j + 1}`,
          chapterId: e.chapterId,
          page: i + j + 1,             // "page" here = chunk number (fine for retrieval links)
          text: slice[j],
          vector: embeds ? embeds[j] : null
        });
      }
      process.stdout.write(`• ${e.chapterId} chunks ${i + 1}-${Math.min(i + BATCH, chunks.length)}\n`);
    }
  }

  writeJson(OUT_INDEX, index);
  console.log(`\n✅ RAG index written to ${OUT_INDEX} (${index.length} chunks, vectors: ${index.filter(x=>x.vector).length})`);
}

main().catch(e => { console.error(e); process.exit(1); });

