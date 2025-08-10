export default function ModuleSwitcher({ current, items }) {
  return (
    <div className="card p-0">
      <div className="tabs">
        {items.map(it => {
          const isActive = current === it.href
          return (
            <a
              key={it.href}
              href={`#${it.href}`}
              className={`tab ${isActive ? 'active' : ''}`}
            >
              {it.label}
            </a>
          )
        })}
      </div>
    </div>
  )
}
