function uid(prefix = 'tsk') {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${t}-${r}`;
}

function ensureStore() {
  if (!window.__tasks) window.__tasks = [];
  return window.__tasks;
}

export async function dispatchAction(ctx = {}, action = {}) {
  const store = ensureStore();
  const task = {
    id: uid(),
    at: new Date().toISOString(),
    action: action.type || action.label || 'action',
    label: action.label || 'Action',
    status: 'queued',
    scope: ctx.scope || 'student',
    payload: action.payload || {},
  };
  store.unshift(task);

  setTimeout(() => {
    const t = store.find(x => x.id === task.id);
    if (t && t.status === 'queued') t.status = 'done';
  }, 600);

  return task;
}

export function getTasks() {
  return ensureStore();
}
