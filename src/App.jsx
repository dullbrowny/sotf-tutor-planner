import { generateInsights } from './insights/generators'
import { computeContext } from './utils/insightFilter'
import { ScopeProvider } from "./context/ScopeProvider";
import { useScopeCompat as useScope } from "./context/scopeCompat";
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
import { assignMicroplan } from './state/assignments'
import { generateSequence, suggestSequenceLLM } from './services/planSequencer'
import PdfCalibrator from './pages/dev/PdfCalibrator'

// Teachers pages
import TeachersDashboard from './pages/teachers/Dashboard'
import StudentProfile from './components/StudentProfile'
import LessonBlockPicker from './components/LessonBlockPicker'
import PlanPreview from './components/PlanPreview'
import AITipsPanel from './components/AITipsPanel'
import LessonPlanning from './pages/teachers/LessonPlanning'
import Assessment from './pages/teachers/Assessment'
import Grading from './pages/teachers/Grading'
import FacultyEval from './pages/teachers/FacultyEval'

// Students
import TutorPlan from './pages/students/TutorPlan'
import Practice from './pages/students/Practice'
import StudentDash from './pages/students/Dashboard'
import StudentPlayback from './pages/students/Playback'

// Admin / Parent / Dev
import AdminOverview from './pages/admin/Overview'
import Predictive from './pages/admin/Predictive'
import ParentPortal from './pages/parent/Portal'
import ParentComms from './pages/parent/Comms'
import CbseAudit from './pages/dev/CbseAudit'

function routeToContextKey(r = '') {
  const route = r.startsWith('#') ? r : `#${r}`;
  if (route.startsWith('#/students/play')) return 'students/playback';
  if (route.startsWith('#/students'))      return 'students/dashboard';
  if (route.startsWith('#/teachers/lesson')) return 'teachers/lesson-planning';
  if (route.startsWith('#/teachers'))      return 'teachers/dashboard';
  if (route.startsWith('#/admin'))         return 'admin/overview';
  if (route.startsWith('#/parent'))        return 'parent/portal';
  return 'teachers/dashboard';
}

function RightRail({ path, scopeKind, selected, onToggle, onClear }) {
  const ctx = computeContext(path, scopeKind);
  const filtered = generateInsights(ctx);

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

      <ClassFeedCard classId="8A" />
    </>
  );
}

function LegacyLessonPlanning() {
  const [klass, setKlass] = useState(8);
  const [subject, setSubject] = useState('Math');
  const [selectedLOs, setSelectedLOs] = useState([]);
  const [plan, setPlan] = useState([]);

  const { scope, classes = [], teacherGroups = [] } = useScope();

  const los = useMemo(() => {
    try { return api.cbse?.getLOs({ klass, subject }) || []; } catch { return []; }
  }, [klass, subject]);

  async function generateMicroplan() {
    if (!selectedLOs.length) return setPlan([]);
    const llm = await suggestSequenceLLM({ klass, subject, loIds: selectedLOs, target: 20 });
    const seq = llm || await generateSequence({ klass, subject, loIds: selectedLOs, target: 20 });
    setPlan(seq.items);
  }

  function toggleLO(id) {
    setSelectedLOs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const totalMinutes = plan.reduce((a, b) => a + (b.estMinutes || 6), 0);

  function resolveClassId() {
    if (scope?.kind === 'class' && scope.classId) return scope.classId;
    if (scope?.kind === 'teacherGroup' && scope.groupId) {
      const g = teacherGroups.find(t => t.id === scope.groupId);
      if (g?.classId) return g.classId;
    }
    const byGrade = classes.find(c => String(c.grade) === String(klass));
    return byGrade?.id || classes[0]?.id || (klass === 8 ? '8A' : klass === 9 ? '9A' : '10A');
  }

  function sendToStudents() {
    if (!plan.length) { alert('No items in plan.'); return; }
    const classId = resolveClassId();
    const now = new Date();
    const dueISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0).toISOString();
    const a = assignMicroplan({ classId, subject, items: plan, dueISO });
    alert(`✅ Assigned ${plan.length} items (${totalMinutes} min) to ${classId}\nAssignment: ${a.id}`);
  }

  return (
    <>
      <div data-testid="page-title" className="sr-only">Lesson Planning (CBSE)</div>

      <Card title="Tutor · Lesson Planner (CBSE · Class 8–10)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

      <Card title={`Auto-Microplan ${plan.length ? `· ${totalMinutes} min` : ''}`}>
        <div className="space-y-2">
          {plan.map(x => (
            <div key={x.id} className="card p-3">
              <div className="text-sm font-medium">{x.qno} · {x.preview}</div>
              {(x?.phase) && (
                <span className="inline-block text-[10px] px-2 py-[2px] rounded-full border border-slate-600 text-slate-300 uppercase tracking-wide mt-1">
                  {x.phase}
                </span>
              )}
              {x.chapterRef && (
                <div className="text-[11px] text-slate-400 mt-1">
                  Chapter: <span className="font-medium">{x.chapterRef.chapterName}</span>
                  {x.chapterRef.page ? <> · p.{x.chapterRef.page}</> : null}
                  {x.chapterRef.url ? <> · <a className="underline" href={x.chapterRef.url} target="_blank" rel="noreferrer">source</a></> : null}
                </div>
              )}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">Est. {x.estMinutes} min</span>
                <CitationLink refObj={x.citation} />
              </div>
            </div>
          ))}
          {!plan.length && <div className="text-sm text-slate-400">Select LO(s) and click “Generate Microplan”.</div>}
        </div>

        <div className="mt-3 flex justify-end">
          <button className="btn-primary" disabled={!plan.length} onClick={sendToStudents}>
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
  const { scope, setScope, classes, teacherGroups, parentGroups } = useScope();

  const section = path.split('/').filter(Boolean)[0] || 'teachers';

  useEffect(() => {
    const desiredKind =
      section === 'teachers' ? 'teacherGroup' :
      section === 'students' ? 'student' :
      section === 'admin'    ? 'school' :
      section === 'parent'   ? 'parentGroup' : 'school';

    if (scope.kind === desiredKind) return;

    if (desiredKind === 'student') {
      setScope({ kind: 'student', studentId: (classes[0]?.studentIds?.[0]) || 's-arya' });
    } else if (desiredKind === 'teacherGroup') {
      setScope({ kind: 'teacherGroup', groupId: (teacherGroups[0]?.id) || 'tg-8a' });
    } else if (desiredKind === 'parentGroup') {
      setScope({ kind: 'parentGroup', groupId: (parentGroups[0]?.id) || 'pg-8a' });
    } else {
      setScope({ kind: 'school' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const onToggle = (ins) =>
    setSelected(prev => prev.some(x => x.id === ins.id) ? prev.filter(x => x.id !== ins.id) : [...prev, ins]);
  const onClear = () => setSelected([]);

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
    { label: 'CBSE QA',    href: '/dev/cbse-audit' },
    { label: 'PDF Cal',    href: '/dev/pdf-cal' },
  ];

  const parentMenu = [
    { label: 'Portal', href: '/parent/portal' },
    { label: 'Comms',  href: '/parent/comms' },
  ];

  let menu = teacherMenu;
  if (path.startsWith('/students')) menu = studentMenu;
  else if (path.startsWith('/admin')) menu = adminMenu;
  else if (path.startsWith('/parent')) menu = parentMenu;

  let page = null;
  if (path === '/teachers/lesson-planning') page = <LessonPlanning />;
  else if (path === '/teachers/assessment') page = <Assessment />;
  else if (path === '/teachers/grading') page = <Grading />;
  else if (path === '/teachers/faculty-eval') page = <FacultyEval />;
  else if (path === '/teachers/dashboard') page = <TeachersDashboard />;
  else if (path.startsWith('/students/play/')) {
    const planId = path.split('/').pop();
    page = <StudentPlayback planId={planId} />;
  }
  else if (path === '/students/tutor-plan') page = <TutorPlan />;
  else if (path === '/students/practice') page = <Practice />;
  else if (path === '/students/dashboard') page = <StudentDash />;
  else if (path === '/admin/overview') page = <AdminOverview />;
  else if (path === '/admin/predictive') page = <Predictive />;
  else if (path === '/dev/cbse-audit') page = <CbseAudit />;
  else if (path === '/dev/pdf-cal') page = <PdfCalibrator />;
  else if (path === '/parent/portal') page = <ParentPortal />;
  else if (path === '/parent/comms') page = <ParentComms />;
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

