export function Card({ title, actions, children }) {
  return (
    <div className="card p-4">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          {title && <div className="panel-title">{title}</div>}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
