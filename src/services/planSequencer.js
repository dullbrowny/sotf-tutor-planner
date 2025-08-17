// src/services/planSequencer.js
import example from "../models/planExample.json";

/** Ensure we always return {starter:[], teach:[], practice:[], assess:[]} */
export function toCanonicalPlan(input) {
  const empty = { starter: [], teach: [], practice: [], assess: [] };
  if (!input) return empty;

  // already canonical-ish
  if (
    typeof input === "object" &&
    ("starter" in input || "teach" in input || "practice" in input || "assess" in input)
  ) {
    const out = { ...empty };
    for (const k of ["starter", "teach", "practice", "assess"]) {
      const v = input[k];
      out[k] = Array.isArray(v) ? v : v ? [v] : [];
    }
    return out;
  }

  if (Array.isArray(input)) {
    const out = { ...empty };
    for (const it of input) {
      const phase = (it?.phase || it?.section || "teach").toString().toLowerCase();
      const node =
        typeof it === "string" ? { text: it } : { title: it.title, text: it.text || it.body || "" };
      if (["starter", "hook", "warmup"].includes(phase)) out.starter.push(node);
      else if (["practice", "guided", "independent"].includes(phase)) out.practice.push(node);
      else if (["assess", "exit", "check"].includes(phase)) out.assess.push(node);
      else out.teach.push(node);
    }
    return out;
  }

  if (typeof input === "string") {
    return { ...empty, teach: [{ text: input }] };
  }

  return empty;
}

export async function generateMicroplan({ grade, subject, chapterId, los, topic }) {
  // If you already call your LLM here, keep it.
  // This fallback keeps dev/demo working.
  const seed =
    example?.plan ||
    [
      { phase: "starter", text: "Quick recap + hook prompt." },
      { phase: "teach", text: "Explain the core idea with one worked example." },
      { phase: "practice", text: "3–5 problems with immediate feedback." },
      { phase: "assess", text: "Exit ticket: 2 questions mapping to LOs." },
    ];

  return toCanonicalPlan(seed);
}

export async function enrichWithRag({ grade, subject, chapterId, los, topic }) {
  // Keep your existing RAG call if present; normalize its shape before returning.
  const enriched =
    example?.enriched ||
    [
      { phase: "starter", text: "Anchor to a real-life scenario from the chapter PDF." },
      { phase: "teach", text: "Use a short passage/diagram reference to ground the concept." },
      { phase: "practice", text: "Targeted questions pulled from chapter context." },
      { phase: "assess", text: "One higher-order question citing the chapter." },
    ];

  return toCanonicalPlan(enriched);
}

// --- Back-compat shim exports for older call sites ---

// Minimal skeleton so PlanPreview has something to render
export function generateMicroplanSkeleton({ los = [], topic = null } = {}) {
  const plan = {
    "Starter / Hook": [
      `Anchor to a real-life scenario from the chapter${topic ? ` (topic: ${topic})` : ""}.`
    ],
    "Teach / Model": [
      "Use a short passage/diagram reference to ground the concept."
    ],
    "Practice": [
      "Targeted questions pulled from chapter context."
    ],
    "Assess / Exit Ticket": [
      "One higher-order question citing the chapter."
    ]
  };

  // Weave a few LOs into Practice, if provided
  los.slice(0, 3).forEach((lo, i) => {
    plan["Practice"].push(`Task ${i + 1}: ${lo}`);
  });

  return plan;
}

// If your file already exports generateMicroplan, leave it.

// Extra aliases for older imports you might still have around:
export const generateSequence = generateMicroplan;
export const suggestSequenceLLM = generateMicroplan;

