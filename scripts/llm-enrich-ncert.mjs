// Build-time LLM pass to enrich manifest with cleaner meta, anchors, topic tags, and LO→chapter matches.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pdfParsePath = require.resolve("pdf-parse/lib/pdf-parse.js");
const { default: pdf } = await import(pdfParsePath);

import { llmJSON } from "./llmClient.mjs";

const ROOT = "public/cbse-pdf";
const MANIFEST = path.join(ROOT, "manifest.json");
const OUT = path.join(ROOT, "manifest.enriched.json");
const LO_BANK = "src/domain/cbse/los.json";
const OUT_LO_MAP = "src/domain/cbse/lo_to_chapter.json";

function readJson(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function writeJson(p, o){ fs.writeFileSync(p, JSON.stringify(o,null,2)); }
function abs(p){ return path.resolve(p); }

async function readPages(absPdf) {
  const buf = new Uint8Array(fs.readFileSync(absPdf));
  const per = [];
  const res = await pdf(buf, {
    pagerender: (pg) => pg.getTextContent().then(tc => tc.items.map(i => i.str || "").join("\n"))
  });
  const chunks = String(res.text||"").split("\f");
  for (let i=0;i<chunks.length;i++) per.push(chunks[i]||"");
  return per;
}

const SCHEMA = {
  type: "object",
  properties: {
    chapter: { type: "object", properties: {
      title: { type: "string" },
      number: { type: "string" },
      subject: { type: "string" },
      grade: { type: "string" }
    }},
    anchors: { type: "array", items: {
      type: "object",
      properties: { type: {type:"string"}, code: {type:"string"}, page: {type:"number"} },
      required: ["type","page"]
    }},
    topics: { type: "array", items: { type: "string" } },
    loMatches: { type: "array", items: {
      type: "object",
      properties: { loId:{type:"string"}, confidence:{type:"number"} },
      required:["loId","confidence"]
    }}
  },
  required: ["chapter"]
};

function firstK(pages, k=6){ return pages.slice(0,k).join("\n\n---\n\n"); }

async function main() {
  if (!fs.existsSync(MANIFEST)) throw new Error(`Missing ${MANIFEST}`);
  const manifest = readJson(MANIFEST);
  const loBank = fs.existsSync(LO_BANK) ? readJson(LO_BANK) : [];

  const loByGradeSubject = new Map();
  for (const lo of loBank) {
    const key = `${lo.grade||""}|${(lo.subject||"").toLowerCase()}`;
    if (!loByGradeSubject.has(key)) loByGradeSubject.set(key, []);
    loByGradeSubject.get(key).push({ id: lo.id, label: lo.label });
  }

  const loRouting = {}; // loId -> {chapterId, confidence}
  let updated = 0;

  for (const e of manifest) {
    const absPdf = abs(path.join(ROOT, e.file));
    if (!fs.existsSync(absPdf)) continue;

    const pages = await readPages(absPdf);
    const primer = firstK(pages, 6);

    // infer subject/grade from chapterId prefix if missing
    const m = /^(\d{1,2})([A-Z])\-/.exec(e.chapterId || "");
    const grade = String(e.grade || (m ? m[1] : ""));
    const subjCode = (m ? m[2] : "");
    const subject = e.subject || (subjCode === "M" ? "Math" : (subjCode === "S" ? "Science" : ""));

    const loCandidates = loByGradeSubject.get(`${grade}|${subject.toLowerCase()}`) || [];

    const messages = [
      { role: "system", content:
        "You extract structure from NCERT chapter text and return STRICT JSON. "+
        "Identify chapter meta (title/number/subject/grade), normalize subject names (Math/Science). "+
        "Extract anchors like Exercises/Examples/Intext Questions/Summary with page numbers if visible in the text. "+
        "From the candidate LOs, pick those taught by this chapter and assign a 0..1 confidence. "+
        "If page numbers are unclear, omit them (do not guess)." },
      { role: "user", content:
        `CANDIDATE LOs: ${JSON.stringify(loCandidates).slice(0,4000)}\n\n`+
        `CHAPTER PREVIEW (first pages):\n${primer}` }
    ];

    try {
      const out = await llmJSON({ messages, schemaName:"ChapterEnrichment", schema: SCHEMA, temperature: 0.1 });
      e.subject = out.chapter?.subject || e.subject || subject;
      e.title   = out.chapter?.title || e.title;
      e.chapterNo = out.chapter?.number || e.chapterNo;
      if (Array.isArray(out.anchors) && out.anchors.length) {
        // merge: keep existing, add new unique (type+code)
        const seen = new Set();
        const merged = [...(Array.isArray(e.anchors)?e.anchors:[]), ...out.anchors].filter(a => {
          const key = `${a.type}:${a.code||""}`;
          if (seen.has(key)) return false; seen.add(key); return true;
        });
        e.anchors = merged;
      }
      if (Array.isArray(out.topics) && out.topics.length) e.tags = out.topics;
      if (Array.isArray(out.loMatches)) {
        for (const lm of out.loMatches) {
          const cur = loRouting[lm.loId];
          if (!cur || (lm.confidence > cur.confidence)) {
            loRouting[lm.loId] = { chapterId: e.chapterId, confidence: lm.confidence };
          }
        }
      }
      updated++;
      process.stdout.write(`• ${e.chapterId} enriched; anchors now ${e.anchors?.length||0}\n`);
    } catch (err) {
      console.warn(`! LLM enrich failed for ${e.chapterId}: ${err.message}`);
    }
  }

  writeJson(OUT, manifest);
  writeJson(OUT_LO_MAP, loRouting);
  console.log(`\n✅ wrote ${OUT} and ${OUT_LO_MAP} (updated ${updated} entries)`);
}
main().catch(e => { console.error(e); process.exit(1); });
