import { useEffect, useState } from 'react'
import { listTasks, onTasksChange, clearTasks } from '../store/tasks'

export default function TasksDrawer() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(listTasks())

  useEffect(() => {
    const off = onTasksChange(setItems)
    return off
  }, [])

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-50 btn-primary shadow-card"
        onClick={() => setOpen(true)}
        title="View tasks"
      >
        Tasks ({items.length})
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)} />
          {/* drawer */}
          <div className="absolute right-0 top-0 h-full w-[380px] card p-4 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="panel-title">Tasks</div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button className="btn-ghost text-xs" onClick={()=>{ clearTasks() }}>Clear all</button>
                )}
                <button className="btn-ghost" onClick={()=>setOpen(false)}>Close</button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="muted text-sm">No tasks yet. Trigger actions from Insights.</div>
            ) : (
              <ul className="space-y-3">
                {items.map(t => (
                  <li key={t.id} className="rounded-xl border border-card-ring p-3 bg-bg/30 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{t.action?.label || 'Action'}</div>
                      <span className="text-xs opacity-70">{new Date(t.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="muted text-xs mt-1">
                      Channel: {t.channel || 'in-app'} • State: {t.state}
                    </div>
                    {t.action?.scope && (
                      <div className="text-[11px] opacity-70 mt-1">
                        Scope: {t.action.scope.kind}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}
