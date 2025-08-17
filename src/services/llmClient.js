// src/services/llmClient.js
// LLM-first helpers with graceful fallback to our RAG utilities.
// Backward compatible with existing callers, plus `mode` support.

import {
  enrichLOs as enrichLosRAG,
  generateMicroplan as generateMicroplanRAG,
  getChapterContext,
} from "./rag";

const CHAT_MODEL =
  import.meta.env.VITE_TOGETHER_CHAT_MODEL ||
  "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";

const TOGETHER_API_KEY =
  import.meta.env.VITE_TOGETHER_API_KEY || import.meta.env.TOGETHER_API_KEY;

function hasKey() {
  return Boolean(TOGETHER_API_KEY);
}

async function callTogether(messages, { json = false, temperature = 0.2, max_tokens = 1200 } = {}) {
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOGETHER_API_KEY}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature,
      stream: false,
      response_format: json ? { type: "json_object" } : undefined,
      max_tokens,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function safeJsonParse(text) {
  try {
    return typeof text === "string" ? JSON.parse(text) : JSON.parse(String(text));
  } catch {
    // try to salvage last JSON object in a verbose reply
    const m = String(text || "").match(/\{[\s\S]*\}$/);
    if (m) {
      try { return JSON.parse(m[0]); } catch {}
    }
    throw new Error("json-parse-failed");
  }
}

export async function enrichLOsLLM({
  gradeLabel, subjectLabel, chapterLabel, topicLabel, los = [], chapterId,
  grade, subject, chapter, topic,
  mode = "Balanced",
}) {
  if (!hasKey()) {
    console.warn("[enrichLOsLLM] falling back to RAG: no key");
    return enrichLosRAG({ chapterId, los, topicLabel: topicLabel ?? topic });
  }

  const g = gradeLabel ?? grade ?? "";
  const s = subjectLabel ?? subject ?? "";
  const ch = chapterLabel ?? chapter ?? "";
  const t = topicLabel ?? topic ?? "(none)";

  // Slightly more creative in Creative; tighter in Grounded
  const temperature = mode === "Creative" ? 0.7 : mode === "Grounded" ? 0.2 : 0.4;

  try {
    const context = await getChapterContext(
      chapterId,
      Number(import.meta.env.RAG_EMBED_MAX_CHARS || 1200)
    );

    const system = [
      "You write short, actionable Learning Objectives.",
      "You MUST align strictly to the user-provided LOs; minimize rewriting.",
      "Do not prefix items with numbers or bullets.",
      'Reply ONLY JSON: {"los":["..."]}. No prose.'
    ].join(" ");

    const user = [
      `Grade: ${g || "(unspecified)"}`,
      `Subject: ${s || "(unspecified)"}`,
      `Chapter: ${ch || "(none)"}`,
      `Topic: ${t}`,
      "",
      `Existing LOs (${los.length}):`,
      ...los.filter(Boolean).map((x, i) => `- ${i + 1}. ${x}`),
      "",
      "Revise minimally: fix clarity/parallelism; do NOT change intent.",
      "If you add 1–2 LOs, they must be tightly aligned with the existing set.",
      "Return JSON only.",
      "",
      `Chapter context (truncated): ${context}`,
    ].join("\n");

    const text = await callTogether(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { json: true, temperature, max_tokens: 600 }
    );

    const parsed = safeJsonParse(text);
    const out = Array.isArray(parsed?.los)
      ? parsed.los.map((s) => String(s).trim()).filter(Boolean)
      : null;

    if (!out?.length) throw new Error("bad-json");
    return out;
  } catch (e) {
    console.warn("[LLM enrich failed, falling back to RAG]", e?.message || e);
    return enrichLosRAG({ chapterId, los, topicLabel: t });
  }
}


/** Microplan — prefer LLM, fallback depends on mode
 *  mode: "Balanced" (default) -> allow fallback
 *        "Creative"           -> NO fallback (LLM only)
 *        "Grounded"           -> not used here (UI calls RAG directly)
 */
export async function generateMicroplanLLM({
  // old & new param names accepted
  gradeLabel, subjectLabel, chapterLabel, topicLabel, los = [], chapterId, mode = "Balanced",
  grade, subject, chapter, topic,
}) {
  if (!hasKey()) {
    console.warn("[generateMicroplanLLM] falling back to RAG: no key");
    return generateMicroplanRAG({ chapterId, los, topicLabel: topicLabel ?? topic });
  }

  const g = gradeLabel ?? grade ?? "";
  const s = subjectLabel ?? subject ?? "";
  const ch = chapterLabel ?? chapter ?? "";
  const t = topicLabel ?? topic ?? "(none)";

  const temperature = mode === "Creative" ? 0.9 : mode === "Balanced" ? 0.5 : 0.2;

  const tryLLM = async () => {
    const context = await getChapterContext(
      chapterId,
      Number(import.meta.env.RAG_EMBED_MAX_CHARS || 1800)
    );

    const system = [
      "You are an expert teacher.",
      'Return ONLY JSON with keys: title, overview, steps (array of {type, minutes, detail}).',
      "Use ONLY the provided Learning Objectives; do not invent new ones.",
      "Keep each step concise (<= 2–3 sentences).",
    ].join(" ");

    const user = [
      `Grade: ${g || "(unspecified)"}`,
      `Subject: ${s || "(unspecified)"}`,
      `Chapter: ${ch || "(none)"}`,
      `Topic: ${t}`,
      "",
      `Learning Objectives (${los.length}):`,
      ...los.filter(Boolean).map((x, i) => `- LO${i + 1}: ${x}`),
      "",
      "Design a short microplan explicitly aligned to the listed LOs.",
      "If appropriate, map steps implicitly to the LOs’ language.",
      "",
      `Chapter context (truncated): ${context}`,
    ].join("\n");

    const text = await callTogether(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { json: true, temperature, max_tokens: 1100 }
    );

    const plan = safeJsonParse(text);
    if (!plan?.steps) throw new Error("bad-json");
    return plan; // { title, overview, steps:[{type, minutes, detail}] }
  };

  try {
    return await tryLLM();
  } catch (e) {
    if (mode === "Creative") {
      // Creative = LLM only; surface the error to the caller/UI
      console.warn("[LLM plan failed; Creative mode -> no fallback]", e?.message || e);
      throw e;
    }
    console.warn("[LLM plan failed, falling back to RAG]", e?.message || e);
    return generateMicroplanRAG({ chapterId, los, topicLabel: t });
  }
}

export default { enrichLOsLLM, generateMicroplanLLM };

