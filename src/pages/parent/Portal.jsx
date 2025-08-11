import { Card } from '../../ui/Card'

const kpis = {
  concepts: { label: 'Concepts mastered (this week)', value: 2 },
  review:   { label: 'Items to review', value: 3 },
  attendance: { label: 'Attendance (term)', value: 94 },
}

const homeworkLog = [
  { date: 'Mon', subject: 'Math',      status: 'Done' },
  { date: 'Tue', subject: 'Science',   status: 'Missed' },
  { date: 'Wed', subject: 'English',   status: 'Done' },
  { date: 'Thu', subject: 'Math',      status: 'Done' },
  { date: 'Fri', subject: 'Science',   status: 'Pending' },
]

const events = [
  { when: 'Sat 10:00', what: 'PTM – quick check-in', where: 'Room 204' },
  { when: 'Sun 09:30', what: 'Weekend practice (20 min)', where: 'Home' },
]

export default function ParentPortal() {
  return (
    <>
      <div data-testid="page-title" className="sr-only">Parent · Portal</div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card title="Concepts mastered">
          <div className="text-3xl font-semibold">{kpis.concepts.value}</div>
          <div className="text-xs text-slate-400 mt-1">{kpis.concepts.label}</div>
        </Card>
        <Card title="Review items">
          <div className="text-3xl font-semibold">{kpis.review.value}</div>
          <div className="text-xs text-slate-400 mt-1">{kpis.review.label}</div>
        </Card>
        <Card title="Attendance">
          <div className="text-3xl font-semibold">{kpis.attendance.value}%</div>
          <div className="h-2 mt-2 bg-slate-800 rounded">
            <div className="h-2 rounded bg-emerald-600" style={{ width: `${kpis.attendance.value}%` }} />
          </div>
          <div className="text-xs text-slate-400 mt-1">{kpis.attendance.label}</div>
        </Card>
      </div>

      {/* Homework log */}
      <Card title="Homework log (this week)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-300">
              <tr className="text-left">
                <th className="py-2 pr-4">Day</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {homeworkLog.map((r, i) => (
                <tr key={i} className="border-t border-slate-800">
                  <td className="py-2 pr-4">{r.date}</td>
                  <td className="py-2 pr-4">{r.subject}</td>
                  <td className="py-2 pr-4">
                    <span className={
                      'text-xs px-2 py-0.5 rounded-full ' +
                      (r.status === 'Done' ? 'bg-emerald-700/40 text-emerald-300' :
                       r.status === 'Missed' ? 'bg-rose-700/40 text-rose-300' :
                       'bg-amber-700/40 text-amber-300')
                    }>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upcoming */}
      <Card title="Upcoming">
        <div className="space-y-2">
          {events.map((e, i) => (
            <div key={i} className="card p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{e.what}</div>
                <div className="text-xs text-slate-400">{e.when} · {e.where}</div>
              </div>
              <button className="btn-primary">Add reminder</button>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

