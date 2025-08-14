
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import CitationLink from "../../components/CitationLink.jsx";
import { addDraft, publish, list as listAssignments } from "../../services/assignments.js";

/** -------------------------------------------------------------------------
 * LessonPlanning (hierarchical) + Draft → Send flow + optional AI enrichment
 * Patch: Avoid dynamic import.meta.glob arguments (Vite requires literals).
 * ------------------------------------------------------------------------ */

const SUBJECT_CODE = {
  Math: "M", Mathematics: "M",
  Science: "S",
  English: "E",
  "Social Science": "SS", "Social-Science": "SS", Social: "SS",
};
const normSubject = (s="") => SUBJECT_CODE[String(s).trim()] || String(s).trim();
const byId = (a,b) => a.chapterId.localeCompare(b.chapterId);

function chapterMatches(klass, subjCode, entry){
  const id = entry.chapterId || "";
  if (!/^\d/.test(id)) return false;
  const gradeOk = String(id).startsWith(String(klass));
  if (!gradeOk) return false;
  if (subjCode === "SS") return id.slice(1,3) === "SS";
  return id.slice(1,2) === subjCode;
}

function buildLocalPdfHref(entry, { anchor } = {}){
  const base = import.meta.env.VITE_CBSE_PDF_BASE || "/cbse-pdf";
  const file = entry?.file ? `${base}/${entry.file}` : null;
  if (!file) return null;
  if (anchor && Array.isArray(entry.anchors)) {
    const hit = entry.anchors.find(a => a.type===anchor.type && String(a.code||"").trim()===String(anchor.code||"").trim());
    if (hit?.page) return `${file}#page=${hit.page}`;
  }
  if (Number.isFinite(entry.offset)) return `${file}#page=1`;
  return `${file}#page=1`;
}

// Helper to read first match from a glob result
function readFirstFromGlob(globObj){
  try {
    const keys = Object.keys(globObj||{});
    if (!keys.length) return null;
    const mod = globObj[keys[0]];
    return mod?.default ?? mod ?? null;
  } catch { return null; }
}

// Cheap Together.ai call for PoC
async function enrichItemsWithAI(draft) {
  const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
  if (!apiKey) throw new Error("VITE_TOGETHER_API_KEY missing");

  const model = import.meta.env.VITE_TOGETHER_CHAT_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";
  const sys = `You are a CBSE teacher assistant. Given a Learning Objective and (optionally) a section hint, 
generate exactly ONE short practice problem aligned to the LO and a succinct solution. 
Format strictly as:
Q: <problem>
A: <concise solution>`;

  const enriched = [];
  for (const it of draft.items) {
    const section = it.anchor?.type ? `${it.anchor.type} ${it.anchor.code ?? ""}`.trim() : "chapter";
    const prompt = `Class ${draft.grade} ${draft.subject}\nChapter: ${draft.chapterId}\nSection: ${section}\nLO: ${it.text}\n\nReturn Q/A as instructed.`;
    try {
      const res = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 300,
        }),
      });
      if (!res.ok) throw new Error(`Together ${res.status}`);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      enriched.push({ ...it, ai: text });
    } catch (e) {
      enriched.push({ ...it, ai: "Q: (offline) Prepare one practice question for this LO.\nA: (teacher-led walkthrough)" });
    }
  }
  return { ...draft, items: enriched };
}

export default function LessonPlanning() {
  /* selections */
  const [klass, setKlass] = useState(9);
  const [subject, setSubject] = useState("Math");
  const [chapterId, setChapterId] = useState("");
  const [topicKey, setTopicKey] = useState(""); // e.g. exercise:2.2
  const [targetMin, setTargetMin] = useState(20);

  /* data */
  const [manifest, setManifest] = useState([]);
  const [chapterEntry, setChapterEntry] = useState(null);
  const [topics, setTopics] = useState([]);   // [{label,key,anchor}]
  const [previewUrl, setPreviewUrl] = useState("");

  /* LOs */
  const [loBank, setLoBank] = useState([]);   // [{id,text,grade,subject,...}]
  const [loMap, setLoMap] = useState({});     // { loId: [chapterId,...] }
  const [visibleLOs, setVisibleLOs] = useState([]);
  const [selectedLOs, setSelectedLOs] = useState([]);

  /* assignment state */
  const [draft, setDraft] = useState(null);
  const [recent, setRecent] = useState([]);
  const [enrichBusy, setEnrichBusy] = useState(false);

  /* manifest */
  useEffect(() => {
    let dead=false;
    (async () => {
      try {
        const r = await fetch("/cbse-pdf/manifest.json", { cache: "no-store" });
        const m = await r.json();
        if (!dead) setManifest(Array.isArray(m) ? m : []);
      } catch { setManifest([]); }
    })();
    return () => { dead=true; };
  }, []);

  /* LO bank + mapping (optional, silent if missing)
     NOTE: we must keep glob arguments literal for Vite. */
  useEffect(() => {
    let dead=false;
    (async () => {
      const bank =
        readFirstFromGlob(import.meta.glob("../../domain/cbse/los.json", { eager: true })) ||
        readFirstFromGlob(import.meta.glob("../../domain/cbse/lo_bank.json", { eager: true })) ||
        [];
      const mapping =
        readFirstFromGlob(import.meta.glob("../../domain/cbse/lo_to_chapter.json", { eager: true })) ||
        {};
      if (!dead){ setLoBank(Array.isArray(bank)?bank:[]); setLoMap(mapping||{}); }
    })();
    return () => { dead=true; };
  }, []);

  /* chapters list for current class/subject */
  const chapters = useMemo(() => {
    const code = normSubject(subject);
    return manifest.filter(e => chapterMatches(klass, code, e)).sort(byId);
  }, [manifest, klass, subject]);

  /* ensure chapter selection valid */
  useEffect(() => {
    if (!chapterId && chapters.length) setChapterId(chapters[0].chapterId);
    else if (chapterId && !chapters.find(c => c.chapterId===chapterId))
      setChapterId(chapters[0]?.chapterId || "");
  }, [chapters, chapterId]);

  /* pick entry */
  useEffect(() => {
    setChapterEntry(chapters.find(c => c.chapterId===chapterId) || null);
  }, [chapterId, chapters]);

  /* topics from anchors (+ chapter start) */
  useEffect(() => {
    if (!chapterEntry){ setTopics([]); setTopicKey(""); return; }
    const list = [{ label:"chapter start", key:"start:CH", anchor:null }];
    const pretty = (a) => {
      if (a.type==="exercises") return "exercises (end)";
      if (a.type==="exercise") return `exercise ${a.code ?? ""}`;
      if (a.type==="example")  return `example ${a.code ?? ""}`;
      return a.type;
    };
    (Array.isArray(chapterEntry.anchors)?chapterEntry.anchors:[]).forEach(a=>{
      list.push({ label:pretty(a), key:`${a.type}:${a.code ?? chapterEntry.chapterNo ?? "CH"}`, anchor:{type:a.type, code:a.code} });
    });
    setTopics(list);
    if (!topicKey || !list.find(t=>t.key===topicKey)) setTopicKey(list[0]?.key || "");
  }, [chapterEntry]);

  /* preview URL */
  useEffect(() => {
    const topic = topics.find(t=>t.key===topicKey);
    if (!chapterEntry || !topic){ setPreviewUrl(""); return; }
    setPreviewUrl(buildLocalPdfHref(chapterEntry, { anchor: topic.anchor || undefined }) || "");
  }, [chapterEntry, topicKey, topics]);

  /* visible LOs (mapped → fallback) */
  useEffect(() => {
    const subjCode = normSubject(subject);
    const hasChapter = (lo) =>
      (lo?.id && Array.isArray(loMap[lo.id]) && loMap[lo.id].includes(chapterId)) ||
      (lo?.chapterRef?.chapterId === chapterId);
    const inGrade = (lo) => (Number.isFinite(lo?.grade) ? Number(lo.grade)===Number(klass) :
                            Array.isArray(lo?.grades) ? lo.grades.map(Number).includes(Number(klass)) : true);
    const inSubject = (lo) => (!lo?.subject) || normSubject(lo.subject)===subjCode;

    let list = loBank.filter(lo => inGrade(lo) && inSubject(lo) && hasChapter(lo));

    if (!list.length) {
      const topic = topics.find(t=>t.key===topicKey);
      if (topic?.anchor?.type==="exercise" && topic.anchor.code){
        const code = String(topic.anchor.code);
        list = [
          { id:`practice:${chapterId}:${code}:q1-5`, text:`Practice: Exercise ${code}, solve Q1–Q5` },
          { id:`discuss:${chapterId}:${code}:concepts`, text:`Discuss key concepts before Exercise ${code}` },
        ];
      } else if (topic?.anchor?.type==="example" && topic.anchor.code){
        const code = String(topic.anchor.code);
        list = [
          { id:`walkthrough:${chapterId}:${code}`, text:`Walkthrough: Example ${code}` },
          { id:`apply:${chapterId}:${code}`, text:`Apply the method from Example ${code} to a new problem` },
        ];
      } else {
        list = [
          { id:`overview:${chapterId}`, text:`Chapter overview + recall prerequisites` },
          { id:`guided:${chapterId}`, text:`Guided practice on the selected section` },
        ];
      }
    }

    setVisibleLOs(list);
    setSelectedLOs(prev => prev.filter(id => list.some(x=>x.id===id)));
  }, [klass, subject, chapterId, topicKey, loBank, loMap, topics]);

  /* refresh recent list when class/subject changes */
  useEffect(() => { setRecent(listAssignments({ klass, subject })); }, [klass, subject]);

  function generateMicroplan(){
    const chosen = visibleLOs.filter(x => selectedLOs.includes(x.id));
    if (!chosen.length) return;

    const each = Math.max(5, Math.round(targetMin / Math.max(1, chosen.length)));
    const items = chosen.map(lo => ({
      id: lo.id,
      text: lo.text || lo.title || lo.name || lo.id,
      chapterId,
      chapterName: chapterEntry?.title || chapterEntry?.file?.split("/").pop(),
      anchor: (topics.find(t => t.key===topicKey)?.anchor) || null,
      estMinutes: each
    }));

    const rec = addDraft({
      grade: klass, subject,
      chapterId,
      chapterName: chapterEntry?.title || chapterEntry?.file?.split("/").pop(),
      topic: topicKey,
      targetMin,
      items
    });
    setDraft(rec);
    setRecent(listAssignments({ klass, subject }));
  }

  async function enrichDraft(){
    if (!draft) return;
    setEnrichBusy(true);
    try {
      const enriched = await enrichItemsWithAI(draft);
      const all = JSON.parse(localStorage.getItem("cbse.assignments.v1") || "[]");
      const i = all.findIndex(x => x.id === draft.id);
      if (i >= 0) { all[i] = enriched; localStorage.setItem("cbse.assignments.v1", JSON.stringify(all)); }
      setDraft(enriched);
    } finally {
      setEnrichBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="rounded-2xl bg-slate-800/40 border border-slate-700 p-4">
        <h2 className="text-lg font-semibold mb-4">Tutor · Lesson Planner</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs block mb-1 opacity-75">Class</label>
            <select className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
              value={klass} onChange={e=>setKlass(Number(e.target.value))}>
              {[8,9,10].map(g => <option key={g} value={g}>Class {g}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1 opacity-75">Subject</label>
            <select className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
              value={subject} onChange={e=>setSubject(e.target.value)}>
              {["Math","Science","English","Social Science"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1 opacity-75">Chapter</label>
            <select className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
              value={chapterId} onChange={e=>setChapterId(e.target.value)}>
              {chapters.map(c => (
                <option key={c.chapterId} value={c.chapterId}>
                  {c.chapterId.replace(/-.+/, "")} · {c.title || c.file?.split("/").pop()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1 opacity-75">Topic</label>
            <select className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2"
              value={topicKey} onChange={e=>setTopicKey(e.target.value)}>
              {topics.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex gap-2">
              {[15,20,30].map(m => (
                <label key={m} className="inline-flex items-center gap-2">
                  <input type="radio" name="targetMin" checked={targetMin===m} onChange={()=>setTargetMin(m)} />
                  <span className="text-xs opacity-80">{m} min</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Inline preview */}
        <div className="mt-3">
          <label className="text-xs block mb-1 opacity-75">Preview</label>
          {previewUrl ? (
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-black/20 h-[480px]">
              <iframe key={previewUrl} src={previewUrl} className="w-full h-full" title="Chapter preview" />
            </div>
          ) : (
            <div className="text-xs opacity-60">Select a Chapter/Topic to preview the local PDF.</div>
          )}
        </div>
      </div>

      {/* LOs */}
      <div className="rounded-2xl bg-slate-800/40 border border-slate-700 p-4">
        <h3 className="font-semibold mb-2">Learning Objectives</h3>
        {!visibleLOs.length ? (
          <div className="text-sm opacity-60">No LOs found yet for this selection.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleLOs.map(lo => (
              <label key={lo.id} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedLOs.includes(lo.id)}
                  onChange={e=>{
                    const on = e.target.checked;
                    setSelectedLOs(prev => on ? [...new Set([...prev, lo.id])] : prev.filter(x=>x!==lo.id));
                  }}
                />
                <span className="text-sm">{lo.text || lo.title || lo.name || lo.id}</span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={generateMicroplan}
            disabled={!selectedLOs.length}
            className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 font-semibold disabled:opacity-50"
            title={!selectedLOs.length ? "Select at least one LO" : ""}
          >
            Generate Microplan (≈{targetMin} min)
          </button>

          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs underline opacity-80 hover:opacity-100">
              Open source in new tab
            </a>
          )}
        </div>
      </div>

      {/* Draft preview & Send */}
      {draft && (
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700 p-4">
          <h3 className="font-semibold mb-2">Auto-Microplan · {draft.targetMin} min</h3>
          <div className="text-xs opacity-70 mb-3">Chapter: {draft.chapterId} · Topic: {draft.topic}</div>
          <div className="flex flex-col gap-2">
            {draft.items.map(it => (
              <div key={it.id} className="rounded-lg border border-slate-700 p-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm">{it.text}</div>
                  <CitationLink className="underline" refObj={{ chapterId: it.chapterId, anchor: it.anchor, title: it.chapterName }} />
                </div>
                {it.ai && (
                  <pre className="mt-2 text-xs whitespace-pre-wrap bg-slate-900/60 p-2 rounded">{it.ai}</pre>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 font-semibold"
              onClick={()=>{
                const sent = publish(draft.id);
                if (sent){ setDraft(null); setRecent(listAssignments({ klass, subject })); alert("Sent to students!"); }
              }}
            >
              Send to Students
            </button>
            <button
              className="rounded-full bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 disabled:opacity-50"
              onClick={enrichDraft}
              disabled={enrichBusy}
              title="Generate 1 practice Q/A per LO (Together.ai)"
            >
              {enrichBusy ? "Enriching…" : "Enrich with AI"}
            </button>
            <button className="rounded-full bg-slate-600 hover:bg-slate-500 text-white px-4 py-2" onClick={()=>setDraft(null)}>
              Discard Draft
            </button>
          </div>
        </div>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700 p-4">
          <h3 className="font-semibold mb-2">Recent Assignments</h3>
          <div className="flex flex-col gap-2">
            {recent.slice(0,5).map(a => (
              <div key={a.id} className="border border-slate-700 rounded-lg p-2">
                <div className="text-xs opacity-70">{a.status.toUpperCase()} · {new Date(a.createdAt).toLocaleString()}</div>
                <div className="font-medium">{a.chapterId} · {a.topic} · {a.targetMin} min</div>
                <ul className="list-disc ml-5 text-sm">
                  {a.items.map(it => <li key={it.id}>{it.text}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
