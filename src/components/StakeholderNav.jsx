import { useState } from 'react'

const groups = [
  { label: 'Teachers', items: [
    { label: 'Assessment', href: '/assessment' },
    { label: 'Grading', href: '/grading' },
  ]},
  { label: 'Students', items: [
    { label: 'Practice', href: '/practice' },
    { label: 'Tutor', href: '/tutor' },
  ]},
  { label: 'Admin', items: [
    { label: 'Admin Dashboard', href: '/admin' },
  ]},
  { label: 'Parent', items: [
    { label: 'Parent', href: '/parent' },
  ]},
]

export default function StakeholderNav() {
  const [open, setOpen] = useState(null)
  return (
    <nav className="flex gap-2 text-sm">
      {groups.map((g, idx) => (
        <div key={g.label} className="relative" onMouseLeave={() => setOpen(null)}>
          <button
            className="px-3 py-1.5 rounded hover:bg-card"
            onMouseEnter={() => setOpen(idx)}
            onClick={() => setOpen(open === idx ? null : idx)}
          >
            {g.label}
          </button>
          {open === idx && (
            <div className="absolute mt-1 w-56 card p-2">
              {g.items.map(it => (
                <a key={it.href} href={it.href}
                   className="block px-2 py-1 rounded hover:bg-bg/40">
                  {it.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}
