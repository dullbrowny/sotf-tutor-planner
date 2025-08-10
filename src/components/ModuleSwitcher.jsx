export default function ModuleSwitcher({ current, items }) {
  return (
    <div className="card p-2 flex flex-wrap gap-2">
      {items.map(it => (
        <a key={it.href} href={`#${it.href}`}
           className={`px-3 py-1.5 rounded-full text-sm border border-card-ring ${current===it.href ? 'bg-accent text-black' : 'hover:bg-bg/40'}`}>
          {it.label}
        </a>
      ))}
    </div>
  )
}
