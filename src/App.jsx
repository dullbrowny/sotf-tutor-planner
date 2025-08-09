import { useState } from 'react'
import { ScopeProvider, useScope } from './context/ScopeProvider'
import Shell from './layouts/Shell'
import { Card } from './ui/Card'
import StudentProfile from './components/StudentProfile'
import LessonBlockPicker from './components/LessonBlockPicker'
import PlanPreview from './components/PlanPreview'
import AITipsPanel from './components/AITipsPanel'
import InsightsRail from './components/InsightsRail'
import ChatPanel from './components/ChatPanel'
import ClassFeedCard from './components/ClassFeedCard'
import insights from './data/insights'
import { dispatchAction } from './agents/dispatcher'

function PlannerPage() {
  const [plan, setPlan] = useState({ intro: [], practice: [], assessment: [] })
  const [selected, setSelected] = useState([]) // array of Insight objects
  const { scope } = useScope()

  const onToggle = (ins) => {
    setSelected(prev => prev.some(x=>x.id===ins.id) ? prev.filter(x=>x.id!==ins.id) : [...prev, ins])
  }

  const onAdd = (stage, item) => {
    setPlan(prev => prev[stage].some(x => x.id === item.id) ? prev
      : ({ ...prev, [stage]: [...prev[stage], item] }))
  }
  const onRemove = (stage, id) => {
    setPlan(prev => ({ ...prev, [stage]: prev[stage].filter(x => x.id !== id) }))
  }
  const onSend = () => alert('Lesson sent to student!\n' + JSON.stringify(plan, null, 2))

  const doAction = async (ins, action) => {
    const task = await dispatchAction(scope, action)
    alert(`✅ Action queued: ${action.label}\nTask: ${task.id}`)
  }

  const doBulkAction = async (insightsArr, action) => {
    for (const ins of insightsArr) {
      await dispatchAction(scope, action)
    }
    alert(`✅ Applied "${action.label}" to ${insightsArr.length} selected insights`)
  }

  const rightRail = (
    <>
      <InsightsRail
        insights={insights}
        selected={selected}
        onToggle={onToggle}
        onAction={doAction}
        onBulkAction={doBulkAction}
      />
      <ChatPanel selectedInsights={selected.length ? selected : [insights[0]]} onAction={doAction} />
      {scope.kind === 'class' && <ClassFeedCard classId={scope.classId} />}
    </>
  )

  return (
    <Shell rightRail={rightRail}>
      <Card title="Tutor · Lesson Planner">
        <StudentProfile />
        <AITipsPanel style="visual" gaps={['equivalent fractions', 'verbal recall']} />
      </Card>
      <LessonBlockPicker onAdd={onAdd} />
      <PlanPreview plan={plan} onRemove={onRemove} />
      <div className="card p-4 flex justify-end gap-2">
        <button className="btn-ghost">Revise</button>
        <button className="btn-primary" onClick={onSend}>Send to Student</button>
      </div>
    </Shell>
  )
}

export default function App() {
  return (
    <ScopeProvider>
      <PlannerPage />
    </ScopeProvider>
  )
}
