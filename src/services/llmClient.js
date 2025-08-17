// src/services/llmClient.js
// LLM-first helpers with graceful fallback to our RAG utilities.

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

async function callTogether(messages, { json = false } = {}) {
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOGETHER_API_KEY}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature: 0.2,
      stream: false,
      response_format: json ? { type: "json_object" } : undefined,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/** LOs — prefer LLM, fall back to RAG */
export async function enrichLOsLLM({
  gradeLabel,
  subjectLabel,
  chapterLabel,
  topicLabel,
  los = [],
  chapterId,
}) {
  if (!hasKey()) {
    console.warn("[enrichLOsLLM] falling back to RAG: no-key");
    return enrichLosRAG({ chapterId, los, topicLabel });
  }

  try {
    const context = await getChapterContext(
      chapterId,
      Number(import.meta.env.RAG_EMBED_MAX_CHARS || 1200)
    );

    const system =
      'You write short, actionable Learning Objectives. Reply ONLY JSON like {"los":["..."]}.';
    const user = `Grade: ${gradeLabel}
Subject: ${subjectLabel}
Chapter: ${chapterLabel}
Topic: ${topicLabel || "(none)"}
Existing LOs: ${los.filter(Boolean).join(" | ")}
Chapter context: ${context}`;

    const text = await callTogether(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { json: true }
    );

    const parsed =
      typeof text === "string" ? JSON.parse(text) : JSON.parse(String(text));
    const out = Array.isArray(parsed?.los)
      ? parsed.los.map((s) => String(s).trim()).filter(Boolean)
      : null;

    if (!out?.length) throw new Error("bad-json");
    return out;
  } catch (e) {
    console.warn("[LLM enrich failed, falling back to RAG]", e?.message || e);
    return enrichLosRAG({ chapterId, los, topicLabel });
  }
}

/** Microplan — prefer LLM, fall back to RAG */
export async function generateMicroplanLLM({
  gradeLabel,
  subjectLabel,
  chapterLabel,
  topicLabel,
  los = [],
  chapterId,
}) {
  if (!hasKey()) {
    console.warn("[generateMicroplanLLM] falling back to RAG: no-key");
    return generateMicroplanRAG({ chapterId, los, topicLabel });
  }

  try {
    const context = await getChapterContext(
      chapterId,
      Number(import.meta.env.RAG_EMBED_MAX_CHARS || 1800)
    );

    const system =
      'You are an expert teacher. Return ONLY JSON with keys: title, overview, steps (array of {type, minutes, detail}).';
    const user = `Grade: ${gradeLabel}
Subject: ${subjectLabel}
Chapter: ${chapterLabel}
Topic: ${topicLabel || "(none)"}
Learning Objectives: ${los.filter(Boolean).join(" | ")}
Chapter context: ${context}`;

    const text = await callTogether(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { json: true }
    );

    const plan =
      typeof text === "string" ? JSON.parse(text) : JSON.parse(String(text));
    if (!plan?.steps) throw new Error("bad-json");
    return plan;
  } catch (e) {
    console.warn("[LLM plan failed, falling back to RAG]", e?.message || e);
    return generateMicroplanRAG({ chapterId, los, topicLabel });
  }
}

export default { enrichLOsLLM, generateMicroplanLLM };

