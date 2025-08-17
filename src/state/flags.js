const FKEY = "sotf.flags.v1";
const load = () => { try { return JSON.parse(localStorage.getItem(FKEY)) || []; } catch { return []; } };
const save = (arr) => { try { localStorage.setItem(FKEY, JSON.stringify(arr)); } catch {} };

export function addFlag({ target, classId, studentId, kind, text }) {
  const all = load();
  all.unshift({ id: `flag_${Date.now()}`, ts: Date.now(), target, classId, studentId, kind, text });
  save(all);
}
export function getFlagsForStudent(studentId) {
  return load().filter(f => (f.target === "student" && f.studentId === studentId));
}
export function getFlagsForClass(classId) {
  return load().filter(f => (f.target === "class" && f.classId === classId));
}
export function getParentNoticesForClass(classId) {
  return getFlagsForClass(classId);
}

