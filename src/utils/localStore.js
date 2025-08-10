export const load = (k, d=null) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }
  catch { return d; }
};
export const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
