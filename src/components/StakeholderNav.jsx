import { useEffect, useState } from 'react'

const groups = [
  { key: 'teachers', label: 'Teachers', items: [
    { label: 'Dashboard', href: '/teachers/dashboard' },
    { label: 'Lesson Planning', href: '/teachers/lesson-planning' },
    { label: 'Assessment', href: '/teachers/assessment' },
    { label: 'Grading', href: '/teachers/grading' },
    { label: 'Faculty Evaluation', href: '/teachers/faculty-eval' },
  ]},
  { key: 'students', label: 'Students', items: [
    { label: 'Dashboard', href: '/students/dashboard' },
    { label: 'Tutor Plan (Micro)', href: '/students/tutor-plan' },
    { label: 'Practice', href: '/students/practice' },
  ]},
  { key: 'admin', label: 'Admin', items: [
    { label: 'Overview', href: '/admin/overview' },
    { label: 'Predictive Analytics', href: '/admin/predictive' },
  ]},
  { key: 'parent', label: 'Parent', items: [
    { label: 'Portal', href: '/parent/portal' },
    { label: 'Communications', href: '/parent/comms' },
  ]},
]

function getSectionFromHash() {
  const h = (window.location.hash || '#/').slice(1) // '/teachers/...'
  const seg = h.split('/').filter(Boolean)[0] || 'teachers'
  return seg
}

export default function StakeholderNav() {
  const [activeSection, setActiveSection] = useState(getSectionFromHash())

  useEffect(() => {
    const onHash = () => setActiveSection(getSectionFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <nav className="topnav">
      {groups.map(g => {
        const isActive = activeSection === g.key
        return (
          <div key={g.key} className="relative group">
            <a href={`#${g.items[0].href}`}
               className={`topnav-link ${isActive ? 'active' : ''}`}>
              {g.label} ▾
            </a>
            <div className="absolute hidden group-hover:block mt-1 w-56 card p-2">
              {g.items.map(it => (
                <a key={it.href} href={`#${it.href}`}
                   className="block px-2 py-1 rounded hover:bg-bg/40 text-text">
                  {it.label}
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
