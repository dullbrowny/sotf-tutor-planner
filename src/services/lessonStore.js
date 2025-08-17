// src/services/lessonStore.js
const KEY = "sof.lessonPlans.v1";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { plans: [], feeds: [] }; }
  catch { return { plans: [], feeds: [] }; }
}
function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

export function savePlan(plan) {
  const s = load();
  const stamped = { ...plan, updatedAt: Date.now() };
  const idx = s.plans.findIndex(p =>
    p.grade === plan.grade && p.subject === plan.subject && p.chapterId === plan.chapterId
  );
  if (idx >= 0) s.plans[idx] = { ...s.plans[idx], ...stamped };
  else s.plans.push(stamped);
  save(s);
  return stamped;
}

export function getLatest({ grade, subject, chapterId } = {}) {
  const s = load();
  const filt = s.plans.filter(p =>
    (!grade || p.grade === grade) &&
    (!subject || p.subject === subject) &&
    (!chapterId || p.chapterId === chapterId)
  );
  return filt.sort((a,b) => (b.updatedAt||0)-(a.updatedAt||0))[0] || null;
}

export function getAllPlans() {
  return load().plans.sort((a,b) => (b.updatedAt||0)-(a.updatedAt||0));
}

export function postFeed({ grade, subject, chapterId, post }) {
  const s = load();
  s.feeds.push({ id: crypto.randomUUID(), grade, subject, chapterId, post, createdAt: Date.now() });
  save(s);
}

export function getFeed({ grade, subject, chapterId } = {}) {
  const s = load();
  return s.feeds
    .filter(f => (!grade || f.grade === grade) && (!subject || f.subject === subject) && (!chapterId || f.chapterId === chapterId))
    .sort((a,b) => b.createdAt - a.createdAt);
}

