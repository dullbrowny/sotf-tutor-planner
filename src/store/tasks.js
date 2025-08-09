const KEY = 'tasks:v2'

export function listTasks() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function createTask({ action, createdBy='system' }) {
  const tasks = listTasks()
  const t = {
    id: 'tsk-' + Date.now(),
    action,
    createdBy,
    createdAt: new Date().toISOString(),
    state: 'queued',
    channel: action.kind === 'schedule' ? 'calendar' :
             action.kind === 'share' ? 'email' : 'in-app'
  }
  tasks.unshift(t)
  localStorage.setItem(KEY, JSON.stringify(tasks))
  return t
}
