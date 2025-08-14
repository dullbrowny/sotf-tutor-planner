// src/lib/loChapterMap.js
const SUBJECT = s => String(s||"").toLowerCase();

export function resolveChapterIdForLO({ grade, subject, loText }) {
  const g = String(grade || "").trim();
  const s = SUBJECT(subject);
  const t = String(loText || "").toLowerCase();

  // ---- Science, Grade 9 → Laws of Motion ----
  if (g === "9" && s.startsWith("science") && (t.includes("newton") || t.includes("first law") || t.includes("inertia") || t.includes("force"))) {
    return "9S-CH02"; // Force and Laws of Motion
  }

  // ---- Mathematics, Grade 10 → Quadratic Equations ----
  if ((g === "10" || g === "10th") && (s.startsWith("math") || s.startsWith("mathematics")) &&
      (t.includes("quadratic") || /\bax\^2\s*\+\s*bx\s*\+\s*c\b/i.test(t))) {
    return "10M-CH04";
  }

  return null; // let existing mapping stand
}

