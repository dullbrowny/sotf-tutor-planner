// Lightweight assignment store for demo/preview.
// Persists to localStorage; no backend required.

const AKEY = "sotf.assignments.v1";
const TKEY = "sotf.attempts.v1";

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function uid(prefix = "a") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function assignMicroplan({ classId, subject, items, dueISO }) {
  const all = load(AKEY, []);
  const id = uid("a");
  const assignment = {
    id,
    classId,
    subject,                   // "Math" | "Science"
    items: items.map(x => ({
      id: x.id ?? uid("it"),
      qno: x.qno,
      preview: x.preview,
      estMinutes: x.estMinutes ?? 6,
      citation: x.citation ?? null,
    })),
    dueISO,
    createdAt: new Date().toISOString(),
  };
  all.unshift(assignment);
  save(AKEY, all);
  return assignment;
}

export function getAssignmentsForClass(classId) {
  const all = load(AKEY, []);
  return all.filter(a => a.classId === classId);
}

// callers must pass classes[] (from ScopeProvider) so we can map student → class
export function getAssignmentsForStudent(studentId, classes) {
  const classId = (classes || []).find(c => (c.studentIds || []).includes(studentId))?.id;
  if (!classId) return [];
  return getAssignmentsForClass(classId);
}

// attempts: keyed by `${assignmentId}:${itemId}` → "pending"|"inprogress"|"done"
export function recordAttempt({ assignmentId, itemId, status }) {
  const m = load(TKEY, {});
  m[`${assignmentId}:${itemId}`] = status;
  save(TKEY, m);
}

export function getItemStatus(assignmentId, itemId) {
  const m = load(TKEY, {});
  return m[`${assignmentId}:${itemId}`] || "pending";
}

export function clearAllAssignments() {
  save(AKEY, []);
  save(TKEY, {});
}

