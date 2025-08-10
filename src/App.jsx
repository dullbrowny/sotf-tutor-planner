import { ScopeProvider, useScope } from './context/ScopeProvider'
import Shell from './layouts/Shell'
import { Card } from './ui/Card'
import InsightsRail from './components/InsightsRail'
import ChatPanel from './components/ChatPanel'
import ClassFeedCard from './components/ClassFeedCard'
import ModuleSwitcher from './components/ModuleSwitcher'
import insights from './data/insights'
import { dispatchAction } from './agents/dispatcher'
import { useState } from 'react'
import { useHashRoute } from './router/useHashRoute'

// Planner bits
import StudentProfile from './components/StudentProfile'
import LessonBlockPicker from './components/LessonBlockPicker'
import PlanPreview from './components/PlanPreview'
import AITipsPanel from './components/AITipsPanel'

// Pages
import LessonPlanning from './pages/teachers/LessonPlanning'
import Assessment from './pages/teachers/Assessment'
import Grading from './pages/teachers/Grading'
import FacultyEval from './pages/teachers/FacultyEval'
import TutorPlan from './pages/students/TutorPlan'
import Practice from './pages/students/Practice'
import StudentDash from './pages/students/Dashboard'
import AdminOverview from './pages/admin/Overview'
import Predictive from './pages/admin/Predictive'
import ParentPortal from './pages/parent/Portal'
import ParentComms from './pages/parent/Comms'

function RightRail({ selected, onToggle, onClear }) {
  const { scope } = useScope()

  const doAction = async (ins, action) => {
    const task = await dispatchAction(scope, action)
    alert(`✅ Action queued: ${action.label}\nTask: ${task.id}`)
  }

  const doBulkAction = async (insightsArr, action) => {
    for (const ins of insightsArr) { await dispatchAction(scope, action) }
    alert(`✅ Applied "${action.label}" to ${insightsArr.length} selected insights`)
  }

  return (
    <>
      <InsightsRail
        insights={insights}
        selected={selected}
        onToggle={onToggle}
        onClear={onClear}
        onAction={doAction}
        onBulkAction={doBulkAction}
      />
      <ChatPanel selectedInsights={selected.length ? selected : [insights[0]]} onAction={doAction} />
      {scope.kind === 'class' && <ClassFeedCard classId={scope.classId} />}
    </>
  )
}

function TeachersLessonPlanner() {
  const [plan, setPlan] = useState({ intro: [], practice: [], assessment: [] })
  const onAdd = (stage, item) => setPlan(prev => prev[stage].some(x => x.id === item.id) ? prev : ({ ...prev, [stage]: [...prev[stage], item] }))
  const onRemove = (stage, id) => setPlan(prev => ({ ...prev, [stage]: prev[stage].filter(x => x.id !== id) }))
  const onSend = () => alert('Lesson sent to student!\n' + JSON.stringify(plan, null, 2))
  return (
    <>
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
    </>
  )
}

function MainArea() {
  const { path } = useHashRoute()
  const [selected, setSelected] = useState([])
  const onToggle = (ins) => setSelected(prev => prev.some(x=>x.id===ins.id) ? prev.filter(x=>x.id!==ins.id) : [...prev, ins])
  const onClear = () => setSelected([])

  // Which stakeholder menu to render
  const teacherMenu = [
    { label: 'Lesson Planning', href: '/teachers/lesson-planning' },
    { label: 'Assessment', href: '/teachers/assessment' },
    { label: 'Grading', href: '/teachers/grading' },
    { label: 'Faculty Evaluation', href: '/teachers/faculty-eval' },
  ]
  const studentMenu = [
    { label: 'Tutor Plan', href: '/students/tutor-plan' },
    { label: 'Practice', href: '/students/practice' },
    { label: 'Dashboard', href: '/students/dashboard' },
  ]
  const adminMenu = [
    { label: 'Overview', href: '/admin/overview' },
    { label: 'Predictive', href: '/admin/predictive' },
  ]
  const parentMenu = [
    { label: 'Portal', href: '/parent/portal' },
    { label: 'Comms', href: '/parent/comms' },
  ]

  let menu = teacherMenu
  if (path.startsWith('/students')) menu = studentMenu
  else if (path.startsWith('/admin')) menu = adminMenu
  else if (path.startsWith('/parent')) menu = parentMenu

  let page = <TeachersLessonPlanner />
  if (path === '/teachers/assessment') page = <Assessment />
  else if (path === '/teachers/grading') page = <Grading />
  else if (path === '/teachers/faculty-eval') page = <FacultyEval />
  else if (path === '/students/tutor-plan') page = <TutorPlan />
  else if (path === '/students/practice') page = <Practice />
  else if (path === '/students/dashboard') page = <StudentDash />
  else if (path === '/admin/overview') page = <AdminOverview />
  else if (path === '/admin/predictive') page = <Predictive />
  else if (path === '/parent/portal') page = <ParentPortal />
  else if (path === '/parent/comms') page = <ParentComms />

  return (
    <Shell rightRail={<RightRail selected={selected} onToggle={onToggle} onClear={onClear} />}>
      <ModuleSwitcher current={path} items={menu} />
      {page}
    </Shell>
  )
}

export default function App() {
  return (
    <ScopeProvider>
      <MainArea />
    </ScopeProvider>
  )
}
