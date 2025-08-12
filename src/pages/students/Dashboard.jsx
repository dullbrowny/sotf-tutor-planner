import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../ui/Card'
import { api } from '../../api'
import CitationLink from '../../components/CitationLink'

export default function StudentDash() {
  const [klass] = useState(8);               // lock demo to Class 8–10 context
  const [subject] = useState('Math');        // could rotate or be chosen elsewhere
  const [today, setToday] = useState([]);

  // Pick dominant LO gaps (mocked mapping) → fetch ~20 min of CBSE exercises
  useEffect(() => {
    try {
      // Demo: favor two LOs; adjust to your events later
      const targetLOs = ['LO8M-CQ-01', 'LO8M-CQ-02']; // Class 8 Math
      const pool = api.cbse?.getExercisesByLO(targetLOs, { limit: 10 }) || [];
      let sum = 0; const picked = [];
      for (const x of pool) { if (sum >= 19) break; picked.push(x); sum += x.estMinutes || 6; }
      setToday(picked);
    } catch { setToday([]); }
  }, []);

  const total = useMemo(() => today.reduce((a,b)=>a+(b.estMinutes||6), 0), [today]);

  return (
    <>
      <div data-testid="page-title" className="sr-only">Student · Dashboard (CBSE)</div>

      <Card title="Today’s 20 (CBSE)">
        <div className="text-xs text-slate-400 mb-2">Class {klass} · {subject}</div>
        <div className="space-y-2">
          {today.map(x => (
            <div key={x.id} className="card p-3">
              <div className="text-sm font-medium">{x.qno} · {x.preview}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">Est. {x.estMinutes} min</span>
                <CitationLink refObj={x.citation} />
              </div>
            </div>
          ))}
          {!today.length && <div className="text-sm text-slate-400">No items queued right now.</div>}
        </div>
        {today.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-300">Total ≈ {total} min</div>
            <button className="btn-primary" onClick={() => alert('Plan started (demo).')}>
              Start
            </button>
          </div>
        )}
      </Card>
    </>
  )
}

