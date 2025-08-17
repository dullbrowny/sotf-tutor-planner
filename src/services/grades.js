/**
 * grades.js
 * Simple rubric/grades store in localStorage:
 * Schema:
 * cbse.grades.v1 = {
 *   [assignmentId]: {
 *     [studentId]: {
 *       [loId]: { level: string|number, comment: string, ts: number }
 *     }
 *   }
 * }
 */
const LS_KEY = "cbse.grades.v1";

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("Failed to parse grades store; resetting.", e);
    return {};
  }
}

function save(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

export function setScore({ assignmentId, studentId, loId, level, comment }) {
  if (!assignmentId || !studentId || !loId) {
    throw new Error("setScore requires assignmentId, studentId, loId");
  }
  const db = load();
  db[assignmentId] = db[assignmentId] || {};
  db[assignmentId][studentId] = db[assignmentId][studentId] || {};
  db[assignmentId][studentId][loId] = {
    level,
    comment: comment || "",
    ts: Date.now()
  };
  save(db);
  return db[assignmentId][studentId][loId];
}

export function getScoresForAssignment(assignmentId) {
  if (!assignmentId) return {};
  const db = load();
  return db[assignmentId] || {};
}

export function getScoresForStudent(studentId) {
  if (!studentId) return {};
  const db = load();
  const out = {};
  for (const [assignmentId, studentMap] of Object.entries(db)) {
    if (studentMap[studentId]) {
      out[assignmentId] = studentMap[studentId];
    }
  }
  return out;
}
