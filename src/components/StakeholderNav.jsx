const groups = [
  { label: 'Teachers', items: [
    { label: 'Lesson Planning', href: '/teachers/lesson-planning' },
    { label: 'Assessment', href: '/teachers/assessment' },
    { label: 'Grading', href: '/teachers/grading' },
    { label: 'Faculty Evaluation', href: '/teachers/faculty-eval' },
  ]},
  { label: 'Students', items: [
    { label: 'Tutor Plan (Micro)', href: '/students/tutor-plan' },
    { label: 'Practice', href: '/students/practice' },
    { label: 'Dashboard', href: '/students/dashboard' },
  ]},
  { label: 'Admin', items: [
    { label: 'Admin Dashboard', href: '/admin/overview' },
    { label: 'Predictive Analytics', href: '/admin/predictive' },
  ]},
  { label: 'Parent', items: [
    { label: 'Parent Portal', href: '/parent/portal' },
    { label: 'Communications', href: '/parent/comms' },
  ]},
]

export default function StakeholderNav() {
  return (
    <nav className="flex gap-2 text-sm">
      {groups.map(g => (
        <div key={g.label} className="relative group">
          <a href={`#${g.items[0].href}`} className="px-3 py-1.5 rounded hover:bg-card">
            {g.label} ▾
          </a>
          <div className="absolute hidden group-hover:block mt-1 w-56 card p-2">
            {g.items.map(it => (
              <a key={it.href} href={`#${it.href}`}
                 className="block px-2 py-1 rounded hover:bg-bg/40">
                {it.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
