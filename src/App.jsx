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

// Teachers
import LessonPlanning from './pages/teachers/LessonPlanning'
import TeacherDash from './pages/teachers/Dashboard'
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
import StudentToday from './pages/students/Today'
import AdminInsights from './pages/admin/Insights'
import ParentFeed from './pages/parent/Feed'

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
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const ctx = useMemo(() => {
    if (path.startsWith('/teachers/lesson')) return { section: 'teachers', page: 'Lesson Planning' };
    if (path.startsWith('/teachers')) return { section: 'teachers', page: 'Dashboard' };
    if (path.startsWith('/students/play')) return { section: 'students', page: 'Playback' };
    if (path.startsWith('/students')) return { section: 'students', page: 'Dashboard' };
    if (path.startsWith('/admin/insights')) return { section: 'admin', page: 'Insights' };
    if (path.startsWith('/admin')) return { section: 'admin', page: 'Overview' };
    if (path.startsWith('/parent/feed')) return { section: 'parent', page: 'Feed' };
    if (path.startsWith('/parent')) return { section: 'parent', page: 'Portal' };
    return { section: 'teachers', page: 'Dashboard' };
  }, [path]);

  const chatPlaceholder = useMemo(() => {
    if (path.startsWith('/teachers/lesson')) return 'Ask to refine this lesson or generate blocks...';
    if (path.startsWith('/admin')) return 'Ask about KPIs, trends, or at-risk flags...';
    if (path.startsWith('/parent')) return 'Ask about your child’s progress or schedule...';
    if (path.startsWith('/students')) return 'Ask about your progress or next steps';
    return 'Type here...';
  }, [path]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const scoped = computeContext(path);
        const res = await generateInsights(scoped);
        if (alive) setInsights(res || []);
      } catch (e) {
        console.warn('Insights load failed', e);
        if (alive) setInsights([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => (alive = false);
  }, [path]);

  const onAction = async (insight) => {
    alert(`(stub) Apply action: ${insight.title}`);
  };
  const onBulkAction = async (insightsArr, action) => {
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
        insights={insights}
        loading={loading}
        selected={selected}
        onToggle={onToggle}
        onClear={onClear}
        onAction={onAction}
        onBulkAction={onBulkAction}
      />

      <ChatPanel
        selectedInsights={selected}
        onAction={onAction}
        placeholder={chatPlaceholder}
        contextKey={routeToContextKey(path)}
      />

      <ClassFeedCard classId="8A" />
    </>
  );
}

function TeacherDashboard() {
  return (
    <Card title="Teacher · Dashboard">
      <div className="muted">No assignments due today yet.</div>
    </Card>
  );
}

function StudentPractice() {
  return (
    <Card title="Practice (stub)">
      <div className="muted">Practice content here.</div>
    </Card>
  );
}

/* ------------------------------- Router ------------------------------- */

function MainArea() {
  const { path } = useHashRoute();
  const { scopeKind } = useScope();

  // Menus
  const teacherMenu = [
    { label: 'Dashboard',        href: '/teachers/dashboard' },
    { label: 'Lesson Planning',  href: '/teachers/lesson-planning' },
    { label: 'Assessment',       href: '/teachers/assessment' },
    { label: 'Grading',          href: '/teachers/grading' },
    { label: 'Faculty Evaluation', href: '/teachers/faculty-eval' },
  ];
  const studentMenu = [
    { label: 'Dashboard',  href: '/students/dashboard' },
    { label: 'Today',      href: '/students/today' },
    { label: 'Tutor Plan', href: '/students/tutor-plan' },
    { label: 'Practice',   href: '/students/practice' },
  ];
  const adminMenu = [
    { label: 'Overview',   href: '/admin/overview' },
    { label: 'Insights',   href: '/admin/insights' },
    { label: 'Predictive', href: '/admin/predictive' },
    { label: 'CBSE QA',    href: '/dev/cbse-audit' },
    { label: 'PDF Cal',    href: '/dev/pdf-cal' },
  ];

  const parentMenu = [
    { label: 'Portal', href: '/parent/portal' },
    { label: 'Feed',   href: '/parent/feed' },
    { label: 'Comms',  href: '/parent/comms' },
  ];

  let menu = teacherMenu;
  if (path.startsWith('/students')) menu = studentMenu;
  else if (path.startsWith('/admin')) menu = adminMenu;
  else if (path.startsWith('/parent')) menu = parentMenu;

  // Routes
  let page = null;
  if (path === '/teachers/lesson-planning') page = <LessonPlanning />;
  else if (path === '/teachers/dashboard')   page = <TeacherDashboard />;
  else if (path === '/teachers/assessment')  page = <Assessment />;
  else if (path === '/teachers/grading')     page = <Grading />;
  else if (path === '/teachers/faculty-eval') page = <FacultyEval />;

  else if (path === '/students/dashboard') page = <StudentDash />;
  else if (path === '/students/today')     page = <StudentToday />;
  else if (path === '/students/tutor-plan') page = <TutorPlan />;
  else if (path === '/students/practice')   page = <Practice />;
  else if (path.startsWith('/students/play')) page = <StudentPlayback />;

  else if (path === '/admin/overview')   page = <AdminOverview />;
  else if (path === '/admin/insights')   page = <AdminInsights />;
  else if (path === '/admin/predictive') page = <Predictive />;

  else if (path === '/parent/portal')  page = <ParentPortal />;
  else if (path === '/parent/feed')    page = <ParentFeed />;
  else if (path === '/parent/comms')   page = <ParentComms />;

  // Default route
  if (!page) page = <LessonPlanning />;

  // Rail selection state (shared)
  const [selected, setSelected] = useState([]);
  const onToggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const onClear = () => setSelected([]);

  // Hide the shell rail on Admin → Overview (the page renders its own rail)
  const pageHasOwnRail = path === '/admin/overview';
  const rail = pageHasOwnRail
    ? null
    : (
      <RightRail
        path={path}
        scopeKind={scopeKind}
        selected={selected}
        onToggle={onToggle}
        onClear={onClear}
      />
    );

  return (
    <Shell rightRail={rail}>
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

