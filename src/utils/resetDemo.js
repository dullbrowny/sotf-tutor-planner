// src/utils/resetDemo.js
const SOF_PREFIX = "sof.";

export function resetTodayAndEvents() {
  let removed = 0;
  for (const k of ["sof.today.v1", "sof.events.v1"]) {
    if (localStorage.getItem(k) != null) { localStorage.removeItem(k); removed++; }
  }
  bump(); // wake up listeners (students' Today, etc.)
  return removed;
}

export function resetAllSof() {
  let removed = 0;
  const keys = Object.keys(localStorage);
  for (const k of keys) {
    if (k.startsWith(SOF_PREFIX)) { localStorage.removeItem(k); removed++; }
  }
  bump();
  return removed;
}

export function dumpSof() {
  const out = {};
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(SOF_PREFIX)) {
      try { out[k] = JSON.parse(localStorage.getItem(k)); }
      catch { out[k] = localStorage.getItem(k); }
    }
  }
  return out;
}

function bump() { try { localStorage.setItem("sof.assign.bump", String(Date.now())); } catch {} }

