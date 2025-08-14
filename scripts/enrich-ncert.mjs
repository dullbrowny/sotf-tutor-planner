#!/usr/bin/env node
// Enrich /public/cbse-pdf/manifest.json by scanning each chapter PDF.
// Extracts: per-chapter offset (book start page - 1) and anchors (exercise/example/etc.).

import fs from "node:fs";
import path from "node:path";
// IMPORTANT: import the real parser impl to avoid loading test PDFs.
import pdf from "pdf-parse/lib/pdf-parse.js";

const OUT_DIR = "public/cbse-pdf";
const MANIFEST = path.join(OUT_DIR, "manifest.json");
const ENRICHED = path.join(OUT_DIR, "manifest.enriched.json");

const R = {
  // headings/labels we care about
  exercise: /\b(?:EXERCISE|Exercise)\s+(\d+(?:\.\d+)?)/,
  example: /\b(?:EXAMPLE|Example|Solved Example)\s+(\d+(?:\.\d+)?)/,
  exercisesBlock: /^\s*(?:EXERCISES|Exercises)\s*$/,
  intext: /\b(?:In[-\s]?text\s+Questions)\b/i,
  summary: /\bSummary\b/i,
  keywords: /\bKeywords\b/i,
  printedPage: /^\s*\d{1,3}\s*$/ // crude numeric-only footer line
};

function abs(p) { return path.resolve(p); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

async function readPages(absPdf) {
  const buf = fs.readFileSync(absPdf);
  const pages = [];
  let pageIndex = 0;

  const opts = {
    pagerender: (pageData) =>
      pageData.getTextContent().then((tc) => {
        // Build a page string with line breaks preserved
        const text = tc.items
          .map((i) => (i.str || "").trim())
          .filter(Boolean)
          .join("\n");
        // pdf-parse processes pages sequentially; maintain our own index
        pageIndex += 1;
        pages[pageIndex - 1] = text;
        return text;
      })
  };

  // Run the parser to trigger pagerender across all pages
  await pdf(buf, opts);
  return pages;
}

function guessBookStart(pageText) {
  const lines = (pageText || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
  // Prefer the last numeric-only line on the page
  const nums = lines
    .filter((l) => R.printedPage.test(l))
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 900);
  if (nums.length) return nums[nums.length - 1];
  return undefined;
}

function indexAnchors(pages, chapterNo) {
  const anchors = [];
  const add = (type, code, page) => anchors.push({ type, code: String(code), page: Number(page) });

  for (let i = 0; i < pages.length; i++) {
    const t = pages[i] || "";
    const firstLine = (t.split("\n")[0] || "").trim();

    const m1 = t.match(R.exercise);
    if (m1) add("exercise", m1[1], i + 1);

    const m2 = t.match(R.example);
    if (m2) add("example", m2[1], i + 1);

    if (R.exercisesBlock.test(firstLine)) add("exercises", String(chapterNo), i + 1);
    if (R.intext.test(t)) add("intext", String(chapterNo), i + 1);
    if (R.summary.test(t)) add("summary", String(chapterNo), i + 1);
    if (R.keywords.test(t)) add("keywords", String(chapterNo), i + 1);
  }

  // Deduplicate (type+code)
  const seen = new Set();
  return anchors.filter((a) => {
    const k = `${a.type}:${a.code}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`Missing ${MANIFEST}. Run ingest first.`);
    process.exit(2);
  }
  const manifest = readJson(MANIFEST);
  let updated = 0;

  for (const entry of manifest) {
    const absPdf = abs(path.join(OUT_DIR, entry.file));
    if (!fs.existsSync(absPdf)) {
      console.warn(`! Missing file for ${entry.chapterId}: ${entry.file}`);
      continue;
    }

    try {
      const pages = await readPages(absPdf);

      // Offset: book start page (from first page footer) minus 1
      let offset = Number(entry.offset || 0);
      if (!offset) {
        const startGuess = guessBookStart(pages[0] || "");
        if (Number.isFinite(startGuess)) offset = startGuess - 1;
      }

      const anchors = indexAnchors(pages, entry.chapterNo);

      entry.offset = Number.isFinite(offset) ? offset : 0;
      entry.anchors = anchors;

      updated++;
      process.stdout.write(
        `• ${entry.chapterId}  pages=${pages.length}  offset=${entry.offset}  anchors=${anchors.length}\n`
      );
    } catch (e) {
      console.warn(`! Failed ${entry.chapterId}: ${e.message}`);
    }
  }

  writeJson(ENRICHED, manifest);
  console.log(`\n✅ Wrote ${ENRICHED} with ${updated} enriched chapters.`);
  console.log(`   To go live: cp ${ENRICHED} ${MANIFEST}`);
}

main();

