import { useScope } from '../context/ScopeProvider'

export default function ScopeBar() {
  const { scope, setScope, Directory } = useScope()

  return (
    <div className="mx-auto max-w-7xl px-4 pt-3">
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="text-sm">Scope:</div>
        <select
          value={scope.kind}
          onChange={(e) => {
            const kind = e.target.value
            if (kind === 'student') setScope({ kind, studentId: Directory.students[0].id })
            else if (kind === 'class') setScope({ kind, classId: Directory.classes[0].id })
            else if (kind === 'grade') setScope({ kind, grade: Directory.classes[0].grade })
            else setScope({ kind: 'school' })
          }}
          className="bg-card rounded px-2 py-1 border border-card-ring text-sm"
        >
          <option value="student">Student</option>
          <option value="class">Class</option>
          <option value="grade">Grade</option>
          <option value="school">School</option>
        </select>

        {scope.kind === 'student' && (
          <select
            value={scope.studentId}
            onChange={(e)=> setScope({ kind: 'student', studentId: e.target.value })}
            className="bg-card rounded px-2 py-1 border border-card-ring text-sm"
          >
            {Directory.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        {scope.kind === 'class' && (
          <select
            value={scope.classId}
            onChange={(e)=> setScope({ kind: 'class', classId: e.target.value })}
            className="bg-card rounded px-2 py-1 border border-card-ring text-sm"
          >
            {Directory.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {scope.kind === 'grade' && (
          <select
            value={scope.grade}
            onChange={(e)=> setScope({ kind: 'grade', grade: e.target.value })}
            className="bg-card rounded px-2 py-1 border border-card-ring text-sm"
          >
            {[...new Set(Directory.classes.map(c=>c.grade))].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        <div className="muted text-xs ml-auto">
          {scope.kind === 'student' && `Student: ${Directory.students.find(s=>s.id===scope.studentId)?.name}`}
          {scope.kind === 'class' && `Class: ${Directory.classes.find(c=>c.id===scope.classId)?.name}`}
          {scope.kind === 'grade' && `Grade: ${scope.grade}`}
          {scope.kind === 'school' && `School-wide`}
        </div>
      </div>
    </div>
  )
}
