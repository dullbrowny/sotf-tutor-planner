export function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-bg/40 border border-card-ring px-2 py-1 text-xs">
      {children}
      {onRemove && (
        <button onClick={onRemove} className="opacity-60 hover:opacity-100">✕</button>
      )}
    </span>
  )
}
