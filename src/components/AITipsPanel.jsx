export default function AITipsPanel({ style='visual', gaps=[] }) {
  const tips = [
    'Prefer visuals over long text for first exposure.',
    'Pair a game with a worksheet to cover kinesthetic + visual.',
    'Keep assessments short but adaptive; give instant visual feedback.',
  ]
  return (
    <div className="space-y-2">
      <h2 className="panel-title">💡 AI Suggestions</h2>
      <ul className="list-disc ml-5 text-sm space-y-1">
        {tips.map((t, idx) => <li key={idx}>{t}</li>)}
      </ul>
      <div className="text-xs muted">
        Context: style={style}; gaps={gaps.join(', ') || 'fractions'}
      </div>
    </div>
  )
}
