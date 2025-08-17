// src/services/assignments.js
const KEY = "cbse.assignments.v1";

function nowISO(){ return new Date().toISOString(); }
function uuid(){ return "a" + Math.random().toString(36).slice(2) + Date.now().toString(36); }

export function loadAll(){
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveAll(list){ localStorage.setItem(KEY, JSON.stringify(list)); }

export function list({ klass, subject, status } = {}){
  const all = loadAll();
  return all.filter(a =>
    (klass ? a.grade === Number(klass) : true) &&
    (subject ? a.subject === subject : true) &&
    (status ? a.status === status : true)
  ).sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""));
}

export function addDraft({ grade, subject, chapterId, chapterName, topic, targetMin, items }){
  const all = loadAll();
  const id = uuid();
  const rec = {
    id, status: "draft", createdAt: nowISO(),
    grade: Number(grade), subject, chapterId, chapterName, topic, targetMin,
    items: items.map(it => ({
      id: it.id, text: it.text,
      chapterId: it.chapterId, chapterName: it.chapterName,
      bookPage: it.bookPage || null, anchor: it.anchor || null,
      estMinutes: it.estMinutes || 6
    }))
  };
  all.unshift(rec); saveAll(all); return rec;
}

export function publish(id){
  const all = loadAll();
  const i = all.findIndex(x => x.id === id);
  if (i >= 0){ all[i].status = "published"; all[i].publishedAt = nowISO(); saveAll(all); return all[i]; }
  return null;
}

export function remove(id){
  const all = loadAll().filter(x => x.id !== id); saveAll(all);
}

