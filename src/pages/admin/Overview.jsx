import { useMemo } from 'react'
import { Card } from '../../ui/Card'

const kpis = {
  passRate: { label: 'Pass rate (G7 Science)', value: 72, delta: -8 },
  attendance: { label: 'Attendance (Term-to-date)', value: 91, delta: -2 },
  atRisk: { label: 'At-risk cohorts', value: 3, delta: +1 },
}

const watchlist = [
  { cohort: '7B · Science', pass: 64, attendance: 88, flagged: ['Low mastery', 'High absence'] },
  { cohort: '7C · Science', pass: 66, attendance: 90, flagged: ['Low mastery'] },
  { cohort: '7A · Math',    pass: 69, attendance: 92, flagged: ['Dips post-unit test'] },
]

const interventions = [
  { id: 'iv-001', title: 'Equivalent Fractions – visual-first block', owner: 'Dept: Science', status: 'Queued' },
  { id: 'iv-002', title: 'Attendance outreach – 7B/7C', owner: 'Counsellor', status: 'In progress' },
  { id: 'iv-003', title: 'After-school clinic – Tuesday/Thursday', owner: 'Admin', status: 'Queued' },
]

function Delta({ n }) {
  const good = n >= 0
  return (
    <span className={(good ? 'text-emerald-300' : 'text-rose-300') + ' text-xs ml-1'}>
      {good ? '▲' : '▼'} {Math.abs(n)}%
    </span>
  )
}

function Spark({ points = [72,70,69,73,74,72], height = 28 }) {
  // tiny inline sparkline (no deps)
  const w = 120
  const max = Math.max(...points), min = Math.min(...points)
  const norm = p => height - ((p - min) / Math.max(1, max - min)) * height
  const step = w / (points.length - 1)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i*step},${norm(p)}`).join(' ')
  return (
    <svg width={w} height={height} className="opacity-80">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export default function AdminOverview() {
  const trend = useMemo(() => [74,73,75,74,73,72], [])

  return (
    <>
      <div data-testid="page-title" className="sr-only">Admin · Overview</div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card title="Pass rate">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-semibold">{kpis.passRate.value}% <Delta n={kpis.passRate.delta} /></div>
            <Spark points={trend} />
          </div>
          <div className="text-xs text-slate-400 mt-1">{kpis.passRate.label}</div>
        </Card>

        <Card title="Attendance">
          <div className="text-3xl font-semibold">{kpis.attendance.value}% <Delta n={kpis.attendance.delta} /></div>
          <div className="h-2 mt-2 bg-slate-800 rounded">
            <div className="h-2 rounded bg-emerald-600" style={{ width: `${kpis.attendance.value}%` }} />
          </div>
          <div className="text-xs text-slate-400 mt-1">{kpis.attendance.label}</div>
        </Card>

        <Card title="At-risk cohorts">
          <div className="text-3xl font-semibold">{kpis.atRisk.value} <Delta n={kpis.atRisk.delta} /></div>
          <div className="text-xs text-slate-400 mt-1">Flagged by mastery/attendance</div>
        </Card>
      </div>

      {/* Watchlist */}
      <Card title="Cohort watchlist">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-300">
              <tr className="text-left">
                <th className="py-2 pr-4">Cohort</th>
                <th className="py-2 pr-4">Pass %</th>
                <th className="py-2 pr-4">Attendance %</th>
                <th className="py-2 pr-4">Flags</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((r, i) => (
                <tr key={i} className="border-t border-slate-800">
                  <td className="py-2 pr-4">{r.cohort}</td>
                  <td className="py-2 pr-4">{r.pass}</td>
                  <td className="py-2 pr-4">{r.attendance}</td>
                  <td className="py-2 pr-4 text-slate-300">{r.flagged.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Interventions */}
      <Card title="Interventions">
        <div className="space-y-2">
          {interventions.map(it => (
            <div key={it.id} className="card p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-slate-400">{it.owner}</div>
              </div>
              <span className={
                'text-xs px-2 py-0.5 rounded-full ' +
                (it.status === 'Queued' ? 'bg-amber-700/40 text-amber-300' :
                 it.status === 'In progress' ? 'bg-sky-700/40 text-sky-300' :
                 'bg-emerald-700/40 text-emerald-300')
              }>{it.status}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

