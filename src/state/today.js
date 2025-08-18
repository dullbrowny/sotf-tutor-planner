// src/state/today.js

// LocalStorage keys
const LS_TODAY = "sof.today.v1";        // Record<studentId, Today[]>
const LS_PLANS = "sof.lessonPlans.v1";  // Plan[] | {plans:[]} | Record<id, Plan>

import { track } from "../lib/track.js";

// ----------------- helpers -----------------
function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function todayISO(d = new Date()) { return d.toISOString().slice(0,10); }
function ensureBucket(studentId) {
  const all = readJSON(LS_TODAY, {});
  if (!all[studentId]) all[studentId] = [];
  return all;
}
function planToSections(plan) {
  const blocks = Array.isArray(plan?.blocks) ? plan.blocks : [];
  return blocks
    .filter(b => (b?.selected !== false) && (b?.studentFacing !== false))
    .map(b => ({ id: String(b.id), title: String(b.title || "Section"), status: "todo" }));
}

// normalize plans from LS_PLANS into an array
function readAllPlans() {
  const raw = readJSON(LS_PLANS, []);
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.plans)) return raw.plans;
    // record map {id: plan}
    const vals = Object.values(raw);
    // guard against accidental nested wrapper objects
    if (vals.length && typeof vals[0] === "object" && !Array.isArray(vals[0])) return vals;
  }
  return [];
}

// ----------------- core API -----------------

/** Create or return a Today entry for this student/plan on today's date. */
export function ensureTodayFor(studentId, plan) {
  if (!studentId || !plan?.id) return null;
  const date = todayISO();
  const all = ensureBucket(studentId);
  const bucket = all[studentId];

  let t = bucket.find(x => x.planId === plan.id && x.date === date);
  if (!t) {
    t = { date, classId: plan.classId || "", studentId, planId: plan.id, sections: planToSections(plan) };
    bucket.push(t);
    writeJSON(LS_TODAY, all);
  }
  return t;
}

/** Read a student's Today entry for a given date (default: today). */
export function getToday(studentId, date = todayISO()) {
  const all = readJSON(LS_TODAY, {});
  const bucket = all[studentId] || [];
  return bucket.find(x => x.date === date) || null;
}

/** Persist a modified Today object for a student (match by date+planId). */
export function saveToday(studentId, today) {
  if (!studentId || !today) return;
  const all = ensureBucket(studentId);
  const bucket = all[studentId];
  const idx = bucket.findIndex(x => x.date === today.date && x.planId === today.planId);
  if (idx >= 0) bucket[idx] = today; else bucket.push(today);
  writeJSON(LS_TODAY, all);
}

/** Update a section's status (and optional note) + event log. */
export function mutateSection(studentId, date, sectionId, status, note) {
  const when = date || todayISO();
  const all = readJSON(LS_TODAY, {});
  const bucket = all[studentId] || [];
  const t = bucket.find(x => x.date === when);
  if (!t) return;

  const s = t.sections.find(x => x.id === sectionId);
  if (!s) return;

  s.status = status;
  if (note && status === "done") s.note = note;
  if (status !== "done" && s.note && !note) delete s.note;

  writeJSON(LS_TODAY, all);

  if (status === "in_progress") {
    track("attempt.started", { studentId, planId: t.planId, sectionId, ts: Date.now() });
  } else if (status === "done") {
    track("attempt.completed", { studentId, planId: t.planId, sectionId, ts: Date.now(), note });
  }
}

// ----------------- assignment helpers -----------------

export function getPlanById(planId) {
  const all = readAllPlans();
  const idStr = String(planId);
  return all.find(p => String(p?.id ?? p?.planId) === idStr) || null;
}

/** Assign a plan to one or more students for today (idempotent). */
export function publishPlanToToday({ plan, classId, studentIds = [] }) {
  if (!plan?.id || !Array.isArray(studentIds) || !studentIds.length) return 0;
  let count = 0;
  for (const studentId of studentIds) {
    const t = ensureTodayFor(studentId, plan);
    if (t) {
      t.classId = t.classId || classId || plan.classId || "";
      saveToday(studentId, t);
      count++;
    }
  }
  try { track("assignment.published", { planId: plan.id, classId, studentIds, ts: Date.now() }); } catch {}
  return count;
}

/**
 * List a student's Today entries (newest first).
 * Options:
 *   - sinceDays (default 3)
 *   - withPlans (default false) → returns [{ today, plan }]
 */
export function listStudentToday(studentId, { sinceDays = 3, withPlans = false } = {}) {
  const all = readJSON(LS_TODAY, {});
  const bucket = all[studentId] || [];
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;

  const items = bucket
    .filter(t => new Date(t.date).getTime() >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!withPlans) return items;

  return items
    .map(t => ({ today: t, plan: getPlanById(t.planId) }))
    .filter(x => !!x.plan);
}

