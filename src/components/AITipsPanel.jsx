export default function AITipsPanel({ style='visual', gaps=[] }) {
  const tips = [
    'Prefer visuals over long text for first exposure.',
    'Pair a game with a worksheet to cover kinesthetic + visual.',
    'Keep assessments short but adaptive; give instant visual feedback.',
  ]
  return (
    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 mb-4">
      <h2 className="font-semibold text-lg mb-2">💡 AI Suggestions</h2>
      <ul className="list-disc ml-5 text-sm space-y-1">
        {tips.map((t, idx) => <li key={idx}>{t}</li>)}
      </ul>
      <div className="text-xs text-gray-500 mt-2">
        Context: style={style}; gaps={gaps.join(', ') || 'fractions'}
      </div>
    </div>
  )
}
