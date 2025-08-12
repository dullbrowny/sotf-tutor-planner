import TEXTBOOK from '../../domain/cbse/textbook_index.json'
import LOCAT from '../../domain/cbse/lo_catalog.json'
import TOPICS from '../../domain/cbse/topic_map.json'
import EXER from '../../domain/cbse/exercise_index.json'
import EXEMPLAR from '../../domain/cbse/exemplar_index.json'

const byId = Object.fromEntries(TEXTBOOK.chapters.map(c => [c.chapterId, c]));

export function linkToChapter(chapterId, page) {
  const ch = byId[chapterId];
  if (!ch) return null;
  const url = ch.baseUrl + (page ? `#page=${page}` : '');
  return { url, page, chapterName: ch.chapterName };
}

// ---- Queries ----
export function getLOs({ klass, subject }) {
  return LOCAT.los.filter(lo =>
    (klass ? lo.class === klass : true) &&
    (subject ? lo.subject.toLowerCase() === subject.toLowerCase() : true)
  );
}

export function findTopicsByLO(loIds = []) {
  const set = new Set(loIds);
  return TOPICS.topics.filter(t => t.lo.some(id => set.has(id)))
    .map(t => ({
      ...t,
      anchors: t.anchors.map(a => ({ ...a, ...linkToChapter(a.chapterId, a.page) }))
    }));
}

function attachCitations(arr) {
  return arr.map(x => ({
    ...x,
    citation: linkToChapter(x.chapterId, x.anchor?.page)
  }));
}

export function getExercisesByLO(loIds = [], opts = {}) {
  const set = new Set(loIds);
  const items = EXER.exercises.filter(e => e.lo.some(id => set.has(id)));
  const limited = typeof opts.limit === 'number' ? items.slice(0, opts.limit) : items;
  return attachCitations(limited);
}

export function getExemplars(loId, opts = {}) {
  const items = EXEMPLAR.exemplars.filter(e => e.lo.includes(loId));
  const limited = typeof opts.limit === 'number' ? items.slice(0, opts.limit) : items;
  return attachCitations(limited);
}

