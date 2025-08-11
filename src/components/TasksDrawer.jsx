import { useEffect, useMemo, useState } from 'react'
import { getTasks } from '../agents/dispatcher'

export default function TasksDrawer({ open, onClose }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTick(t => t + 1), 400)
    return () => clearInterval(id)
  }, [open])

  const tasks = getTasks()
  const [filter, setFilter] = useState('all') // all|queued|done|failed

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks
    return tasks.filter(t => t.status === filter)
  }, [tasks, filter, tick])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[380px] h-full bg-[#0b0f17] border-l border-slate-800 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Tasks</div>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-slate-300">Filter</label>
          <select
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="queued">Queued</option>
            <option value="done">Done</option>
            <option value="failed">Failed</option>
          </select>
          <div className="ml-auto text-xs text-slate-400">{filtered.length} shown</div>
        </div>

        <div className="space-y-2">
          {filtered.map(t => (
            <div key={t.id} className="card p-3">
              <div className="flex items-center gap-2">
                <span className={
                  'text-[10px] px-2 py-0.5 rounded-full ' +
                  (t.status === 'done' ? 'bg-emerald-700/40 text-emerald-300' :
                   t.status === 'queued' ? 'bg-amber-700/40 text-amber-300' :
                   'bg-rose-700/40 text-rose-300')
                }>
                  {t.status.toUpperCase()}
                </span>
                <div className="text-sm font-medium">{t.label}</div>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                <div>Action: <span className="text-slate-200">{t.action}</span></div>
                <div>At: <span className="text-slate-200">{new Date(t.at).toLocaleString()}</span></div>
                {t.payload && Object.keys(t.payload).length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer">Payload</summary>
                    <pre className="text-[11px] bg-slate-900 p-2 rounded border border-slate-800 overflow-auto">
{JSON.stringify(t.payload, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
          {!filtered.length && (
            <div className="text-sm text-slate-400">No tasks match this filter.</div>
          )}
        </div>
      </div>
    </div>
  )
}
