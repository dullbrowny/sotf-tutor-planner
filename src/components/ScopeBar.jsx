import { useEffect, useMemo, useState } from 'react'
import { useScope } from '../context/ScopeProvider'

function getSectionFromHash() {
  const h = (window.location.hash || '#/').slice(1) // '/teachers/...'
  const seg = h.split('/').filter(Boolean)[0] || 'teachers'
  return seg
}

const defaultsBySection = {
  teachers:  { kind: 'teacherGroup' },
  students:  { kind: 'student' },
  admin:     { kind: 'school' },
  parent:    { kind: 'parentGroup' },
}

const allowedKindsBySection = {
  teachers: ['teacherGroup', 'class', 'grade', 'school'],
  students: ['student', 'class', 'grade', 'school'],
  admin:    ['school', 'grade', 'class', 'teacherGroup', 'parentGroup'],
  parent:   ['parentGroup', 'student', 'class', 'school'],
}

export default function ScopeBar() {
  const { scope, setScope, Directory } = useScope()
  const [section, setSection] = useState(getSectionFromHash())

  // Track hash to know which stakeholder we're in
  useEffect(() => {
    const onHash = () => setSection(getSectionFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const storageKey = useMemo(() => `scope:last:${section}`, [section])

  // On section change: restore previous scope or apply sensible default
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Only apply if it matches allowed kinds for the section
        if (allowedKindsBySection[section]?.includes(parsed.kind)) {
          setScope(parsed)
          return
        }
      } catch { /* noop */ }
    }
    // No saved or not allowed -> set default for section
    const def = defaultsBySection[section] || { kind: 'school' }
    if (def.kind === 'student') {
      setScope({ kind: 'student', studentId: (Directory.students[0] || {}).id })
    } else if (def.kind === 'teacherGroup') {
      setScope({ kind: 'teacherGroup', groupId: (Directory.teacherGroups[0] || {}).id })
    } else if (def.kind === 'parentGroup') {
      setScope({ kind: 'parentGroup', groupId: (Directory.parentGroups[0] || {}).id })
    } else if (def.kind === 'class') {
      setScope({ kind: 'class', classId: (Directory.classes[0] || {}).id })
    } else if (def.kind === 'grade') {
      setScope({ kind: 'grade', grade: (Directory.classes[0] || {}).grade })
    } else {
      setScope({ kind: 'school' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // Persist any scope change for the current section
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(scope))
  }, [scope, storageKey])

  const allowedKinds = allowedKindsBySection[section] || ['school']

  // Helpers to switch kinds while keeping the section rules
  const changeKind = (kind) => {
    if (!allowedKinds.includes(kind)) return
    if (kind === 'student')
      setScope({ kind, studentId: (Directory.students[0] || {}).id })
    else if (kind === 'class')
      setScope({ kind, classId: (Directory.classes[0] || {}).id })
    else if (kind === 'grade')
      setScope({ kind, grade: (Directory.classes[0] || {}).grade })
    else if (kind === 'teacherGroup')
      setScope({ kind, groupId: (Directory.teacherGroups[0] || {}).id })
    else if (kind === 'parentGroup')
      setScope({ kind, groupId: (Directory.parentGroups[0] || {}).id })
    else
      setScope({ kind: 'school' })
  }

  // Nice label on the far right
  const scopeLabel = useMemo(() => {
    if (scope.kind === 'student') {
      const s = Directory.students.find(x => x.id === scope.studentId)
      return `Student: ${s?.name || '—'}`
    }
    if (scope.kind === 'class') {
      const c = Directory.classes.find(x => x.id === scope.classId)
      return `Class: ${c?.name || '—'}`
    }
    if (scope.kind === 'grade') return `Grade: ${scope.grade || '—'}`
    if (scope.kind === 'teacherGroup') {
      const g = Directory.teacherGroups.find(x => x.id === scope.groupId)
      return `Group: ${g?.name || '—'}`
    }
    if (scope.kind === 'parentGroup') {
      const g = Directory.parentGroups.find(x => x.id === scope.groupId)
      return `Group: ${g?.name || '—'}`
    }
    return 'School-wide'
  }, [scope, Directory])

  return (
    <div className="mx-auto max-w-7xl px-4 pt-3">
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="text-sm">Scope:</div>

        {/* Kind selector filtered by current section */}
        <select
          value={scope.kind}
          onChange={(e) => changeKind(e.target.value)}
          className="bg-card rounded px-2 py-1 border border-card-ring text-sm"
        >
          {allowedKinds.includes('student') && <option value="student">Student</option>}
          {allowedKinds.includes('class') && <option value="class">Class</option>}
          {allowedKinds.includes('grade') && <option value="grade">Grade</option>}
          {allowedKinds.includes('teacherGroup') && <option value="teacherGroup">Teacher Group</option>}
          {allowedKinds.includes('parentGroup') && <option value="parentGroup">Parent Group</option>}
          {allowedKinds.includes('school') && <option value="school">School</option>}
        </select>

        {/* Entity pickers (only show the one relevant to current kind) */}
        {scope.kind === 'student' && (
          <select value={scope.studentId || ''}
                  onChange={(e)=> setScope({ kind: 'student', studentId: e.target.value })}
                  className="bg-card rounded px-2 py-1 border border-card-ring text-sm">
            {Directory.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        {scope.kind === 'class' && (
          <select value={scope.classId || ''}
                  onChange={(e)=> setScope({ kind: 'class', classId: e.target.value })}
                  className="bg-card rounded px-2 py-1 border border-card-ring text-sm">
            {Directory.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {scope.kind === 'grade' && (
          <select value={scope.grade || ''}
                  onChange={(e)=> setScope({ kind: 'grade', grade: e.target.value })}
                  className="bg-card rounded px-2 py-1 border border-card-ring text-sm">
            {[...new Set(Directory.classes.map(c=>c.grade))].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        {scope.kind === 'teacherGroup' && (
          <select value={scope.groupId || ''}
                  onChange={(e)=> setScope({ kind: 'teacherGroup', groupId: e.target.value })}
                  className="bg-card rounded px-2 py-1 border border-card-ring text-sm">
            {Directory.teacherGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        {scope.kind === 'parentGroup' && (
          <select value={scope.groupId || ''}
                  onChange={(e)=> setScope({ kind: 'parentGroup', groupId: e.target.value })}
                  className="bg-card rounded px-2 py-1 border border-card-ring text-sm">
            {Directory.parentGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        <div className="muted text-xs ml-auto">{scopeLabel}</div>
      </div>
    </div>
  )
}
