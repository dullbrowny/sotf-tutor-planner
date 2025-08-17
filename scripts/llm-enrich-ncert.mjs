
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
const OUT_ENRICHED = path.resolve(ROOT, "public/cbse-pdf/manifest.enriched.json");

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || "";
const MODEL = process.env.TOGETHER_MODEL_LIGHT || process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";
const ENRICH_SAMPLE_PAGES = Math.max(2, parseInt(process.env.ENRICH_SAMPLE_PAGES || "12", 10));
const ENRICH_MAX_CONTEXT_CHARS = Math.max(500, parseInt(process.env.ENRICH_MAX_CONTEXT_CHARS || "4000", 10));

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf-8")); }
function writeJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2)); }
function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
function titleCase(s) { return s.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()); }

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

function scanAnchorsHeuristically(pages) {
  const candidates = [];
  const add = (name, page) => candidates.push({ name, page });

  const n = Math.min(ENRICH_SAMPLE_PAGES, Math.ceil(pages.length / 2));
  const ranges = [
    { s: 0, e: Math.min(n, pages.length) },
    { s: Math.max(0, pages.length - n), e: pages.length }
  ];

  const patterns = [
    { re: /\bEXERCISES?\b/g, label: "Exercises" },
    { re: /\bSUMMARY\b/g, label: "Summary" },
    { re: /\bKEYWORDS\b/g, label: "Keywords" },
    { re: /\bEXAMPLES?\b/g, label: "Examples" },
    { re: /\bEXAMPLE\s+\d+\b/g, label: "Example" },
    { re: /\bIN[-\s]?TEXT\s+QUESTIONS?\b/g, label: "Intext Questions" },
    { re: /\bTRY\s+THESE\b/g, label: "Try These" }
  ];

  for (const r of ranges) {
    for (let i = r.s; i < r.e; i++) {
      const txt = pages[i] || "";
      if (!txt) continue;
      for (const p of patterns) {
        let m;
        while ((m = p.re.exec(txt)) !== null) {
          const idx = m.index;
          if (idx <= 200) {
            const label = p.label === "Example" ? titleCase(m[0]) : p.label;
            add(label, i + 1);
          }
        }
      }
    }
  }
  const seen = new Set();
  return candidates.filter(c => {
    const k = `${c.name}|${c.page}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function refineAnchorsWithLLM({ chapterId, candidates, context }) {
  if (!TOGETHER_API_KEY) return null;
  const system = `You are an assistant that extracts textbook anchor pages for NCERT-like CBSE PDFs.
Return strict JSON only with this shape:
{"anchors":[{"name":"Exercises","page":123},{"name":"Summary","page":87},{"name":"Example 1","page":45}]}
Rules:
- Only include anchors if they are actually present.
- Allowed names: "Exercises","Summary","Keywords","Examples","Example 1","Example 2","Intext Questions","Try These".
- For Examples, prefer granular names like "Example 1","Example 2" if visible; else "Examples".
- Page numbers must be PDF page numbers as provided in candidates.
- If unsure, keep the candidate as-is; do not invent.
- Do not include additional fields.`;

  const user = JSON.stringify({ chapterId, candidates, context: context.slice(0, ENRICH_MAX_CONTEXT_CHARS) });

  try {
    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOGETHER_API_KEY}` },
      body: JSON.stringify({ model: MODEL, temperature: 0.1, messages: [{ role: "system", content: system }, { role: "user", content: user }] })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "?");
      console.warn(`[ENRICH] LLM non-OK ${res.status}: ${txt.slice(0,200)}`);
      return null;
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const payload = JSON.parse(text.slice(start, end + 1));
    if (!payload || !Array.isArray(payload.anchors)) return null;
    return payload.anchors
      .filter(a => a && a.name && Number.isFinite(Number(a.page)))
      .map(a => ({ name: String(a.name), page: Number(a.page) }));
  } catch (e) {
    console.warn("[ENRICH] LLM refine failed; using heuristics.", e);
    return null;
  }
}

function normalizeAnchors(any) {
  if (!any) return [];
  if (Array.isArray(any)) {
    return any.map(a => {
      if (a && typeof a === "object") {
        const name = a.name || a.title || a.anchor || a.key;
        const page = a.page ?? a.pg ?? a.p;
        if (!name || page == null) return null;
        return { name: String(name), page: Number(page) };
      }
      return null;
    }).filter(Boolean);
  }
  if (typeof any === "object") {
    return Object.entries(any).map(([k, v]) => ({ name: String(k), page: Number(v) }));
  }
  return [];
}

function mergeAnchors(existing, added) {
  const normExisting = normalizeAnchors(existing);
  const normAdded = normalizeAnchors(added);
  const out = [...normExisting];
  const seen = new Set(normExisting.map(a => `${a.name.toLowerCase()}|${a.page}`));
  for (const a of normAdded) {
    const k = `${a.name.toLowerCase()}|${a.page}`;
    if (!seen.has(k)) { out.push(a); seen.add(k); }
  }
  for (const a of out) {
    const low = a.name.toLowerCase();
    if (low.includes("exercise")) a.name = "Exercises";
    if (low === "summary") a.name = "Summary";
    if (low === "keywords") a.name = "Keywords";
    if (low === "examples") a.name = "Examples";
  }
  out.sort((x,y) => (x.page||0) - (y.page||0));
  return out;
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

  const enriched = [];
  for (const e of list) {
    const chapterId = deriveChapterId(e);
    const absPdf = resolvePdfPath(e.file);
    if (!fs.existsSync(absPdf)) { console.warn(`[ENRICH] Missing PDF for ${chapterId}: ${absPdf}`); enriched.push(e); continue; }

    console.log(`• Analyzing ${chapterId}`);
    const pages = await readPdfPages(absPdf);
    const n = Math.min(ENRICH_SAMPLE_PAGES, Math.ceil(pages.length / 2));
    const heur = scanAnchorsHeuristically(pages);
    let context = pages.slice(0, n).join("\n\n") + "\n\n---\n\n" + pages.slice(-n).join("\n\n");
    if (context.length > ENRICH_MAX_CONTEXT_CHARS) context = context.slice(0, ENRICH_MAX_CONTEXT_CHARS);

    let refined = null;
    if (TOGETHER_API_KEY && heur.length) {
      refined = await refineAnchorsWithLLM({ chapterId, candidates: heur, context });
    }
    const mergedAnchors = mergeAnchors(e.anchors, refined || heur);
    const out = { ...e, anchors: mergedAnchors };
    enriched.push(out);
  }

  writeJson(OUT_ENRICHED, enriched);
  console.log(`\n✅ Enriched manifest written: ${path.relative(ROOT, OUT_ENRICHED)} (${enriched.length} entries)`);
}

main().catch(err => { console.error(err); process.exit(1); });
