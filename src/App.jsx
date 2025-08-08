import { useState } from 'react'
import StudentProfile from './components/StudentProfile'
import LessonBlockPicker from './components/LessonBlockPicker'
import PlanPreview from './components/PlanPreview'
import AITipsPanel from './components/AITipsPanel'
import FooterActions from './components/FooterActions'

export default function App() {
  const [plan, setPlan] = useState({ intro: [], practice: [], assessment: [] })

  const onAdd = (stage, item) => {
    setPlan(prev => {
      if (prev[stage].some(x => x.id === item.id)) return prev
      return { ...prev, [stage]: [...prev[stage], item] }
    })
  }

  const onRemove = (stage, id) => {
    setPlan(prev => ({ ...prev, [stage]: prev[stage].filter(x => x.id !== id) }))
  }

  const onSend = () => {
    alert('Lesson sent to student!\n' + JSON.stringify(plan, null, 2))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">📘 SOTF Tutor Lesson Planner</h1>
      <StudentProfile />
      <AITipsPanel style="visual" gaps={['equivalent fractions', 'verbal recall']} />
      <LessonBlockPicker onAdd={onAdd} />
      <PlanPreview plan={plan} onRemove={onRemove} />
      <FooterActions onSend={onSend} />
    </div>
  )
}
