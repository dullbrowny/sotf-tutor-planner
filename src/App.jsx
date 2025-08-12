import { generateInsights } from './insights/generators'
import { computeContext } from './utils/insightFilter'
import { ScopeProvider, useScope } from './context/ScopeProvider'
import Shell from './layouts/Shell'
import ModuleSwitcher from './components/ModuleSwitcher'
import InsightsRail from './components/InsightsRail'
import ChatPanel from './components/ChatPanel'
import ClassFeedCard from './components/ClassFeedCard'
import { dispatchAction } from './agents/dispatcher'
import { useEffect, useState, useMemo } from 'react'
import { useHashRoute } from './router/useHashRoute'
import { Card } from './ui/Card'
import { api } from './api';
import CitationLink from './components/CitationLink';


// Teachers: dashboard + planner bits
import TeachersDashboard from './pages/teachers/Dashboard'
import StudentProfile from './components/StudentProfile'
import LessonBlockPicker from './components/LessonBlockPicker'
import PlanPreview from './components/PlanPreview'
import AITipsPanel from './components/AITipsPanel'

// Teachers pages
import LessonPlanning from './pages/teachers/LessonPlanning'
import Assessment from './pages/teachers/Assessment'
import Grading from './pages/teachers/Grading'
import FacultyEval from './pages/teachers/FacultyEval'

// Students pages
import TutorPlan from './pages/students/TutorPlan'
import Practice from './pages/students/Practice'
import StudentDash from './pages/students/Dashboard'
import StudentPlayback from './pages/students/Playback'

// Admin pages
import AdminOverview from './pages/admin/Overview'
import Predictive from './pages/admin/Predictive'

// Parent pages
import ParentPortal from './pages/parent/Portal'
import ParentComms from './pages/parent/Comms'

// Map current route/hash → a stable chat context key
function routeToContextKey(r = '') {
  const route = r.startsWith('#') ? r : `#${r}`; // normalize "/parent/portal" → "#/parent/portal"
  if (route.startsWith('#/students/play')) return 'students/playback';
  if (route.startsWith('#/students'))      return 'students/dashboard';
  if (route.startsWith('#/teachers/plan')) return 'teachers/lesson-planning';
  if (route.startsWith('#/teachers'))      return 'teachers/dashboard';
  if (route.startsWith('#/admin'))         return 'admin/overview';
  if (route.startsWith('#/parent'))        return 'parent/portal';
  return 'teachers/dashboard';
}

function RightRail({ path, scopeKind, selected, onToggle, onClear }) {
  const ctx = computeContext(path, scopeKind);

  const filtered = generateInsights(ctx);

  // context-aware chat hint
  const chatHintMap = {
    'students/playback': 'Ask about this step or your plan…',
    'students/dashboard': 'Ask about your progress or next steps…',
    'teachers/lesson-planning': 'Ask to refine this lesson or generate blocks…',
    'teachers/dashboard': 'Ask about classes, grading queue, or suggestions…',
    'admin/overview': 'Ask about KPIs, trends, or at-risk flags…',
    'parent/portal': 'Ask about your child’s progress or schedule…',
  };
  const chatPlaceholder = chatHintMap[ctx.key] || 'Ask anything…';

  const doAction = async (_ins, action) => {
    const task = await dispatchAction({}, action);
    alert(`✅ Action queued: ${action.label}\nTask: ${task.id}`);
  };
  const doBulkAction = async (insightsArr, action) => {
    for (const _ of insightsArr) await dispatchAction({}, action);
    alert(`✅ Applied "${action.label}" to ${insightsArr.length} selected insights`);
  };

  return (
    <>
      <div className="px-2 py-1 text-xs text-slate-300" data-testid="rail-context">
        <span className="opacity-70">Context:</span>{' '}
        <span className="font-medium">{ctx.section}</span>
        <span className="opacity-50"> · </span>
        <span className="font-medium capitalize">{ctx.page}</span>
      </div>

      <InsightsRail
        insights={filtered.length ? filtered : []}
        selected={selected}
        onToggle={onToggle}
        onClear={onClear}
        onAction={doAction}
        onBulkAction={doBulkAction}
      />

      <ChatPanel
       selectedInsights={selected}
       onAction={doAction}
       placeholder={chatPlaceholder}
       contextKey={routeToContextKey(path)}
     />

      <ClassFeedCard classId="7B" />
    </>
  );
}


function TeachersLessonPlanner() {
  const [klass, setKlass] = useState(8);                 // 8–10 only
  const [subject, setSubject] = useState('Math');        // 'Math' | 'Science'
  const [selectedLOs, setSelectedLOs] = useState([]);
  const [plan, setPlan] = useState([]);                  // [{ qno, preview, estMinutes, citation }]

  // Fetch LOs for the chosen class/subject (grounded to CBSE pack)
  const los = useMemo(() => {
    try { return api.cbse?.getLOs({ klass, subject }) || []; } catch { return []; }
  }, [klass, subject]);

  // Pick ~20 min of exercises from selected LOs
  function generateMicroplan() {
    if (!selectedLOs.length) return setPlan([]);
    try {
      const ex = api.cbse?.getExercisesByLO(selectedLOs, { limit: 12 }) || [];
      // greedy pack ≈ 20 min
      let sum = 0; const picked = [];
      for (const x of ex) {
        if (sum >= 19) break;
        picked.push(x); sum += x.estMinutes || 6;
      }
      setPlan(picked);
    } catch { setPlan([]); }
  }

  function toggleLO(id) {
    setSelectedLOs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const totalMinutes = plan.reduce((a, b) => a + (b.estMinutes || 6), 0);

  return (
    <>
      <div data-testid="page-title" className="sr-only">Lesson Planning (CBSE)</div>

      <Card title="Tutor · Lesson Planner (CBSE · Class 8–10)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Class / Subject (locked to CBSE 8–10) */}
          <div className="space-y-1">
            <div className="text-xs text-slate-300">Class</div>
            <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                    value={klass} onChange={e => setKlass(Number(e.target.value))}>
              {[8,9,10].map(n => <option key={n} value={n}>Class {n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-300">Subject</div>
            <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                    value={subject} onChange={e => setSubject(e.target.value)}>
              <option>Math</option>
              <option>Science</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary ml-auto" onClick={generateMicroplan}>
              Generate Microplan (≈20 min)
            </button>
          </div>
        </div>

        {/* LO picker */}
        <div className="mt-4">
          <div className="text-xs text-slate-300 mb-1">Learning Objectives</div>
          <div className="flex flex-wrap gap-2">
            {los.map(lo => (
              <label key={lo.id} className={
                "text-xs px-2 py-1 rounded border cursor-pointer " +
                (selectedLOs.includes(lo.id)
                  ? "bg-sky-700/30 border-sky-600 text-sky-200"
                  : "bg-slate-800/60 border-slate-700 text-slate-200")
              }>
                <input
                  type="checkbox"
                  checked={selectedLOs.includes(lo.id)}
                  onChange={() => toggleLO(lo.id)}
                  className="mr-1 align-middle accent-sky-500"
                />
                {lo.label}
              </label>
            ))}
            {!los.length && <span className="text-xs text-slate-400">No LOs found for this selection.</span>}
          </div>
        </div>
      </Card>

      {/* Generated plan */}
      <Card title={`Auto‑Microplan ${plan.length ? `· ${totalMinutes} min` : ''}`}>
        <div className="space-y-2">
          {plan.map(x => (
            <div key={x.id} className="card p-3">
              <div className="text-sm font-medium">{x.qno} · {x.preview}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">Est. {x.estMinutes} min</span>
                <CitationLink refObj={x.citation} />
              </div>
            </div>
          ))}
          {!plan.length && <div className="text-sm text-slate-400">Select LO(s) and click “Generate Microplan”.</div>}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            className="btn-primary"
            disabled={!plan.length}
            onClick={() => alert('Plan sent to students (demo).')}
          >
            Send to Students
          </button>
        </div>
      </Card>
    </>
  )
}


function MainArea() {
  const { path } = useHashRoute('/teachers/dashboard');

  const [selected, setSelected] = useState([]);
  const { scope, setScope, Directory } = useScope();

  // Derive top section from hash route
  const section = path.split('/').filter(Boolean)[0] || 'teachers';

  // Auto-sync Scope with top section
  useEffect(() => {
    const desiredKind =
      section === 'teachers' ? 'teacherGroup' :
      section === 'students' ? 'student' :
      section === 'admin'    ? 'school' :
      section === 'parent'   ? 'parentGroup' : 'school';

    if (scope.kind === desiredKind) return;

    if (desiredKind === 'student') {
      setScope({ kind: 'student', studentId: (Directory.students[0] || {}).id });
    } else if (desiredKind === 'teacherGroup') {
      setScope({ kind: 'teacherGroup', groupId: (Directory.teacherGroups[0] || {}).id });
    } else if (desiredKind === 'parentGroup') {
      setScope({ kind: 'parentGroup', groupId: (Directory.parentGroups[0] || {}).id });
    } else {
      setScope({ kind: 'school' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const onToggle = (ins) =>
    setSelected(prev => prev.some(x => x.id === ins.id) ? prev.filter(x => x.id !== ins.id) : [...prev, ins]);
  const onClear = () => setSelected([]);

  // Menus (Dashboard first; Playback is deep-linked only)
  const teacherMenu = [
    { label: 'Dashboard',        href: '/teachers/dashboard' },
    { label: 'Lesson Planning',  href: '/teachers/lesson-planning' },
    { label: 'Assessment',       href: '/teachers/assessment' },
    { label: 'Grading',          href: '/teachers/grading' },
    { label: 'Faculty Evaluation', href: '/teachers/faculty-eval' },
  ];
  const studentMenu = [
    { label: 'Dashboard',  href: '/students/dashboard' },
    { label: 'Tutor Plan', href: '/students/tutor-plan' },
    { label: 'Practice',   href: '/students/practice' },
  ];
  const adminMenu = [
    { label: 'Overview',   href: '/admin/overview' },
    { label: 'Predictive', href: '/admin/predictive' },
  ];
  const parentMenu = [
    { label: 'Portal', href: '/parent/portal' },
    { label: 'Comms',  href: '/parent/comms' },
  ];

  let menu = teacherMenu;
  if (path.startsWith('/students')) menu = studentMenu;
  else if (path.startsWith('/admin')) menu = adminMenu;
  else if (path.startsWith('/parent')) menu = parentMenu;

  // -------- Routing --------
  let page = null;

  // Teachers
  if (path === '/teachers/lesson-planning') page = <TeachersLessonPlanner />;
  else if (path === '/teachers/assessment') page = <Assessment />;
  else if (path === '/teachers/grading') page = <Grading />;
  else if (path === '/teachers/faculty-eval') page = <FacultyEval />;
  else if (path === '/teachers/dashboard') page = <TeachersDashboard />;

  // Students (order matters: playback before dashboard)
  else if (path.startsWith('/students/play/')) {
    const planId = path.split('/').pop();
    page = <StudentPlayback planId={planId} />;
  }
  else if (path === '/students/tutor-plan') page = <TutorPlan />;
  else if (path === '/students/practice') page = <Practice />;
  else if (path === '/students/dashboard') page = <StudentDash />;

  // Admin
  else if (path === '/admin/overview') page = <AdminOverview />;
  else if (path === '/admin/predictive') page = <Predictive />;

  // Parent
  else if (path === '/parent/portal') page = <ParentPortal />;
  else if (path === '/parent/comms') page = <ParentComms />;

  // Fallback (default)
  if (!page) page = <TeachersDashboard />;

  return (
    <Shell rightRail={<RightRail path={path} scopeKind={scope.kind} selected={selected} onToggle={onToggle} onClear={onClear} />}>
      <ModuleSwitcher current={path} items={menu} />
      {page}
    </Shell>
  );
}

export default function App() {
  return (
    <ScopeProvider>
      <MainArea />
    </ScopeProvider>
  )
}

