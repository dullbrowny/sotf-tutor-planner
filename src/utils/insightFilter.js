// src/utils/insightFilter.js
export function computeContext(path, scopeKind) {
  const segs = path.split('/').filter(Boolean);
  const section = segs[0] || 'teachers';
  let page = segs[1] || 'dashboard';
  if (section === 'students' && segs[1] === 'play') page = 'playback';
  return { key: `${section}/${page}`, section, page, scopeKind };
}

export function filterInsights(all, ctx, audienceHint) {
  return all.filter(ins => {
    const okAudience = !audienceHint || (ins.audience || []).includes(audienceHint);
    const okCtx      = !ins.contexts || ins.contexts.includes(ctx.key);
    const okScope    = !ins.scopes   || ins.scopes.includes(ctx.scopeKind);
    return okAudience && okCtx && okScope;
  });
}

