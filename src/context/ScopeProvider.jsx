import { createContext, useContext, useMemo, useState } from 'react'

const Directory = {
  classes: [
    { id: '7B', name: 'Grade 7B', grade: '7', teacherIds: ['t-1'], studentIds: ['s-arya'] },
  ],
  students: [
    { id: 's-arya', name: 'Arya Kapoor', grade: '7', classId: '7B' },
  ],
  teachers: [
    { id: 't-1', name: 'Ms. Mehta', classIds: ['7B'] },
  ],
  teacherGroups: [
    { id: 'tg-math', name: 'Math Teachers (G7)' },
  ],
  parentGroups: [
    { id: 'pg-7b', name: 'Parents of 7B' },
  ],
}

const ScopeContext = createContext(null)

export function ScopeProvider({ children }) {
  const [scope, setScope] = useState({ kind: 'student', studentId: 's-arya' })
  const value = useMemo(() => ({ scope, setScope, Directory }), [scope])
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

export function useScope() {
  const ctx = useContext(ScopeContext)
  if (!ctx) throw new Error('useScope must be used within ScopeProvider')
  return ctx
}
