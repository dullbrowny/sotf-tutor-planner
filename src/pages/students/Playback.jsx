import { useEffect, useMemo, useState } from 'react'
import demoPlan from '../../models/planExample.json'
import { load, save } from '../../utils/localStore'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { dispatchAction } from '../../agents/dispatcher'
import { useScope } from '../../context/ScopeProvider'

function usePlan(planId) {
  // In future: fetch(`/api/plan/${planId}`)
  const plan = demoPlan.id === planId ? demoPlan : demoPlan
  return plan
}

export default function StudentPlayback({ planId }) {
  const plan = usePlan(planId || 'plan_demo_001')
  const storageKey = `plan:progress:${plan.id}`
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(() => load(storageKey, {
    stepStatus: {}, // id -> 'todo' | 'done' | 'help'
    startedAt: Date.now()
  }))
  const { scope } = useScope()

  useEffect(() => { save(storageKey, progress) }, [progress])

  const steps = plan.steps
  const current = steps[idx]

  const setStatus = (id, status) =>
    setProgress(p => ({ ...p, stepStatus: { ...p.stepStatus, [id]: status }}))

  const doneCount = useMemo(
    () => steps.filter(s => progress.stepStatus[s.id] === 'done').length,
    [steps, progress]
  )
  const pct = Math.round((doneCount / steps.length) * 100)

  const next = () => setIdx(i => Math.min(i+1, steps.length-1))
  const prev = () => setIdx(i => Math.max(i-1, 0))

  const shareProgress = async () => {
    const payload = {
      planId: plan.id,
      studentId: plan.studentId,
      progress: progress.stepStatus,
      percent: pct
    }
    const task = await dispatchAction(payload, { id:'share_progress', label:'Share progress with teacher' })
    alert(`Shared with teacher. Task ${task.id}`)
  }

  const askForHelp = async () => {
    const task = await dispatchAction({ planId: plan.id, stepId: current.id }, { id:'request_help', label:`Help on ${current.label}`})
    setStatus(current.id, 'help')
    alert(`Help requested. Task ${task.id}`)
  }

  return (
    <>
      <Card title={`Student · Playback — ${plan.title}`}>
        <div className="flex items-center gap-3 text-sm mb-3">
          <div className="w-full h-2 bg-card rounded">
            <div className="h-2 bg-attn rounded" style={{ width: `${pct}%` }} />
          </div>
          <div className="muted">{pct}%</div>
        </div>

        {/* Step list */}
        <div className="flex flex-wrap gap-2 mb-4">
          {steps.map((s, i) => {
            const st = progress.stepStatus[s.id] || 'todo'
            const stateDot = st === 'done' ? '✅' : (st === 'help' ? '🆘' : '•')
            return (
              <button key={s.id}
                className={`px-3 py-2 rounded border border-card-ring ${i===idx?'bg-bg':''}`}
                onClick={()=>setIdx(i)}
                title={s.label}
              >
                <span className="mr-2">{stateDot}</span>
                <span className="text-xs">{s.stage}</span>
                <div className="text-sm">{s.label}</div>
              </button>
            )
          })}
        </div>

        {/* Current step */}
        <div className="card p-4 mb-3">
          <div className="text-sm muted mb-1">{current.stage} • {current.type} • ~{current.estMins} mins</div>
          <div className="text-lg mb-2">{current.label}</div>
          <div className="text-sm">{current.content}</div>
        </div>

        <div className="flex gap-2">
          <Button onClick={prev}>Back</Button>
          <Button onClick={()=>{ setStatus(current.id,'done'); next(); }} variant="primary">Mark done → Next</Button>
          <Button onClick={askForHelp}>Ask for help</Button>
          <div className="ml-auto" />
          <Button onClick={shareProgress} variant="primary">Share progress with teacher</Button>
        </div>
      </Card>

      <div className="card p-4 mt-3">
        <div className="text-sm muted">Scope: {scope.kind}</div>
        <div className="text-xs muted">Plan ID: {plan.id}</div>
      </div>
    </>
  )
}
