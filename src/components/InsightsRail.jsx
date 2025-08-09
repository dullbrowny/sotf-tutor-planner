import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

function dedupeActions(actions=[]) {
  // Deduplicate by action id or (label+kind)
  const map = new Map()
  for (const a of actions) {
    const key = a.id || `${a.label}:${a.kind}:${a.channel||''}`
    if (!map.has(key)) map.set(key, a)
  }
  return [...map.values()]
}

export default function InsightsRail({
  insights = [],
  selected = [],
  onToggle,            // (insight) => void
  onAction,            // (insight, action) => void
  onBulkAction,        // (selectedInsights[], action) => void
}) {
  const selectedIds = new Set(selected.map(i => i.id))
  const selectedActions = dedupeActions(
    selected.flatMap(i => i.suggestedActions || [])
  )

  return (
    <div className="space-y-4">
      <Card title="AI Insights">
        {insights.length === 0 ? (
          <div className="muted text-sm">No insights yet.</div>
        ) : (
          <ul className="space-y-3">
            {insights.map(ins => {
              const isSel = selectedIds.has(ins.id)
              return (
                <li key={ins.id}
                    className={`rounded-xl border border-card-ring p-3 bg-bg/30 ${isSel ? 'ring-2 ring-accent/60' : ''}`}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => onToggle && onToggle(ins)}
                      className="mt-1 accent-accent"
                      aria-label={`Select ${ins.title}`}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{ins.title}</div>
                      <div className="muted text-sm mt-1">{ins.detail}</div>
                    </div>
                  </div>
                  {/* per-insight actions */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ins.suggestedActions?.map(a => (
                      <Button key={a.id || a.label} variant="primary"
                        onClick={() => onAction && onAction(ins, a)}>
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Aggregate actions for selected */}
      {selected.length > 0 && (
        <Card title={`Actions for Selected (${selected.length})`}>
          <div className="flex flex-wrap gap-2">
            {selectedActions.map(a => (
              <Button key={a.id || a.label} onClick={() => onBulkAction && onBulkAction(selected, a)}>
                {a.label}
              </Button>
            ))}
          </div>
          <div className="muted text-xs mt-2">
            Will apply to all selected insights.
          </div>
        </Card>
      )}
    </div>
  )
}
