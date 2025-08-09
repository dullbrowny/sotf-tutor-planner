export function Card({ title, actions, children }) {
  return (
    <div className="card p-4">
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="panel-title">{title}</h3>
          <div className="flex gap-2">{actions}</div>
        </div>
      )}
      {children}
    </div>
  );
}
