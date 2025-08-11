export default function PlanPreview({ plan, onRemove }) {
  const sections = Object.keys(plan)
  return (
    <div className="card p-4">
      <h2 className="panel-title mb-3">Finalized Lesson Plan (Preview)</h2>
      <div className="space-y-3">
        {sections.map(sec => (
          <div key={sec} className="bg-card border border-card-ring rounded-lg p-3">
            <h3 className="font-semibold capitalize mb-2">{sec}</h3>
            {plan[sec].length === 0 ? (
              <div className="text-sm muted">No blocks selected.</div>
            ) : (
              <ul className="space-y-2">
                {plan[sec].map(item => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="muted">{item.type} • {item.duration}</div>
                    </div>
                    <button
                      className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                      onClick={() => onRemove(sec, item.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
