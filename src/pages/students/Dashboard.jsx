import { Card } from '../../ui/Card'


export default function Dashboard() {
  return (
    <Card title="Students · Dashboard">
      <div className="text-sm">Snapshot, streaks, and suggestions. (Stub)</div>
      <div className="mt-3">
        <a className="btn-primary inline-block" href="#/students/play/plan_demo_001">
          Continue: Fractions microplan
        </a>
      </div>
    </Card>
  )
}
