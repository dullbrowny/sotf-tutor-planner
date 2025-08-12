import idx from "../domain/cbse/topic_index.json";
import { api } from "../api";

// Prefer chapter info already present in citation; else map LO -> chapter
function fromCitation(cit) {
  if (!cit) return null;
  const has = cit.chapterName || cit.page || cit.url || cit.chapterId;
  if (!has) return null;
  return {
    chapterId: cit.chapterId || null,
    chapterName: cit.chapterName || null,
    page: cit.page || null,
    url: cit.url || null,
  };
}

export function chapterRefForLO(loId, pageHint) {
  const hit = idx.find(x => x.loId === loId);
  if (!hit) return null;
  const page = pageHint ?? (Array.isArray(hit.pages) ? hit.pages[0] : hit.pages);
  try {
    const link = api.cbse?.linkToChapter(hit.chapterId, page);
    return {
      chapterId: hit.chapterId,
      chapterName: hit.chapterName ?? link?.chapterName ?? null,
      page,
      url: link?.url ?? null,
    };
  } catch {
    return null;
  }
}

// Attach chapterRef to each exercise, preferring citation info
export function annotateWithChapter(exArray, loIds) {
  const primary = loIds?.[0];
  return (exArray || []).map(ex => {
    const viaCit = fromCitation(ex?.citation);
    if (viaCit) return { ...ex, chapterRef: viaCit };
    const viaIdx = primary ? chapterRefForLO(primary, ex?.citation?.page) : null;
    return { ...ex, chapterRef: viaIdx };
  });
}

