#!/usr/bin/env node
// NCERT ingest: unzip zips -> public/cbse-pdf/sources/**,
// build manifest.json with {chapterId, file, title, grade, subject, chapterNo, offset}
// Recognizes NCERT code patterns like iemh101.pdf, iesc112.pdf, etc.
// Uses scripts/ncert-prefix-map.json to map 4-letter prefixes to grade/subject.

import { execSync } from "node:child_process";
import {
  existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync
} from "node:fs";
import { join, basename, extname } from "node:path";

const SRC_DIR = process.argv[2] || "ncert_zips";
const OUT_DIR = "public/cbse-pdf";
const SRC_OUT = join(OUT_DIR, "sources");
const MANIFEST = join(OUT_DIR, "manifest.json");
const MAP_FILE = "scripts/ncert-prefix-map.json";

function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

function unzipAll() {
  ensureDir(SRC_OUT);
  const entries = readdirSync(SRC_DIR).filter(f => f.toLowerCase().endsWith(".zip"));
  if (!entries.length) {
    console.error(`No .zip files found under ${SRC_DIR}`);
    process.exit(1);
  }
  for (const z of entries) {
    const src = join(SRC_DIR, z);
    const name = basename(z, extname(z));
    const dest = join(SRC_OUT, name);
    ensureDir(dest);
    console.log(`📦 Unzipping ${z} → ${dest}`);
    execSync(`unzip -o "${src}" -d "${dest}"`, { stdio: "inherit" });
  }
}

function walk(dir, out=[]) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function loadPrefixMap() {
  if (!existsSync(MAP_FILE)) {
    console.error(`Missing ${MAP_FILE}. Please create it and rerun.`);
    process.exit(2);
  }
  try {
    return JSON.parse(readFileSync(MAP_FILE, "utf8"));
  } catch (e) {
    console.error(`Failed to parse ${MAP_FILE}: ${e.message}`);
    process.exit(2);
  }
}

// Skip non-chapter PDFs (prefaces, solutions, answer keys, etc.)
function isSkippable(name) {
  const n = name.toLowerCase();
  return (
    n.endsWith("ps.pdf") || // preface/part?
    n.endsWith("an.pdf") || // answer
    n.endsWith("a1.pdf") || // appendix
    n.endsWith("a2.pdf") ||
    n.endsWith("cc.pdf") || // cover/credits
    n.endsWith("gl.pdf") || // glossary
    n.endsWith(".jpg")     // covers
  );
}

// Recognize NCERT code pattern: xxxx1NN.pdf -> prefix(4) + series(1) + chapter(2)
const CODE_RE = /^([a-z]{4})(\d)(\d{2})\.pdf$/i;

function parseCode(filename) {
  const m = filename.match(CODE_RE);
  if (!m) return null;
  const [, prefix, _series, ch2] = m;
  return { prefix: prefix.toLowerCase(), chapterNo: Number(ch2) };
}

function deriveChapterId(grade, subject, chapterNo) {
  const subjCode = ({
    "Math": "M",
    "Science": "S",
    "English": "E",
    "Social Science": "SS"
  })[subject];
  if (!subjCode) return null;
  return `${grade}${subjCode}-CH${String(chapterNo).padStart(2, "0")}`;
}

function main() {
  ensureDir(OUT_DIR);
  unzipAll();
  const files = walk(SRC_OUT).filter(p => p.toLowerCase().endsWith(".pdf"));
  console.log(`🔎 Found ${files.length} PDFs`);

  const prefixMap = loadPrefixMap();
  const unknownPrefixes = new Set();

  const entries = [];
  for (const absPath of files) {
    const rel = absPath.replace(/^[^/]*public\/cbse-pdf\//, "").replace(/\\/g, "/"); // normalize
    const name = basename(absPath);
    if (isSkippable(name)) continue;

    const code = parseCode(name);
    if (!code) { /* silently skip non-code PDFs */ continue; }

    const map = prefixMap[code.prefix];
    if (!map) { unknownPrefixes.add(code.prefix); continue; }

    const grade = map.grade;
    const subject = map.subject;
    const chapterNo = code.chapterNo;

    // Only keep our demo grades 8-10
    if (![8,9,10].includes(grade)) continue;

    const chapterId = deriveChapterId(grade, subject, chapterNo);
    if (!chapterId) continue;

    entries.push({
      chapterId,
      file: rel.replace(/^sources\//, "sources/"), // already relative to /cbse-pdf
      title: name,
      grade,
      subject,
      chapterNo,
      offset: 0
    });
  }

  // Merge with existing manifest if present
  let existing = [];
  if (existsSync(MANIFEST)) {
    try { existing = JSON.parse(readFileSync(MANIFEST, "utf8")); } catch {}
  }
  const byId = new Map(existing.map(e => [e.chapterId, e]));
  for (const e of entries) byId.set(e.chapterId, e);
  const merged = Array.from(byId.values())
    .sort((a,b)=> (a.grade-b.grade) || a.subject.localeCompare(b.subject) || (a.chapterNo-b.chapterNo));

  writeFileSync(MANIFEST, JSON.stringify(merged, null, 2), "utf8");
  console.log(`🗂  Wrote manifest with ${merged.length} entries → ${MANIFEST}`);

  if (unknownPrefixes.size) {
    console.warn("⚠️  Unknown 4-letter prefixes found (add to scripts/ncert-prefix-map.json):");
    console.warn("    " + Array.from(unknownPrefixes).sort().join(", "));
  } else {
    console.log("✅ All prefixes recognized.");
  }
}

main();

