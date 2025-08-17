const NKEY = "sotf.nudges.v1";
const RKEY = "sotf.requests.v1";
const jget = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function sendNudge({ fromParentGroup, toStudentId, text }) {
  const all = jget(NKEY);
  all.unshift({ id:`n_${Date.now()}`, ts: Date.now(), fromParentGroup, toStudentId, text });
  jset(NKEY, all);
  return all[0];
}
export function getNudgesForStudent(studentId) {
  return jget(NKEY).filter(n => n.toStudentId === studentId);
}

export function escalateToAdmin({ fromParentGroup, classId, text }) {
  const all = jget(RKEY);
  all.unshift({ id:`req_${Date.now()}`, ts: Date.now(), fromParentGroup, classId, text, status:"open" });
  jset(RKEY, all);
  return all[0];
}
export function getParentRequests() { return jget(RKEY); }

