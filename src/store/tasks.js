const KEY = 'tasks:v2'
const EVT = 'tasks:changed'

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
    channel: action.channel ||
             (action.kind === 'schedule' ? 'calendar' :
              action.kind === 'share' ? 'email' : 'in-app')
  }
  tasks.unshift(t)
  localStorage.setItem(KEY, JSON.stringify(tasks))
  window.dispatchEvent(new CustomEvent(EVT))
  return t
}

export function clearTasks() {
  localStorage.setItem(KEY, JSON.stringify([]))
  window.dispatchEvent(new CustomEvent(EVT))
}

export function onTasksChange(cb) {
  function handler(){ cb(listTasks()) }
  window.addEventListener(EVT, handler)
  return () => window.removeEventListener(EVT, handler)
}
