// src/layouts/Shell.jsx
import StakeholderNav from '../components/StakeholderNav';
import ScopeBar from '../components/ScopeBar';
import TasksDrawer from '../components/TasksDrawer';
import TasksButton from '../components/TasksButton';
import { useEffect, useState } from 'react';

export default function Shell({ children, rightRail }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasRail = !!rightRail;

  // === Global NAV data-testid shim (permanent & robust) ===
  useEffect(() => {
    // Log that the effect ran at all
    console.debug('[nav-shim] effect mounted');

    const root = document; // scan full doc so header source/timing doesn't matter

    const stamp = () => {
      try {
        const q = (sel) => root.querySelector(sel);
        const byText = (re) =>
          [...root.querySelectorAll('a,button,span,div,[role="tab"],[role="button"]')].find((el) =>
            re.test((el.textContent || '').trim().toLowerCase())
          );
        const setId = (el, id) => {
          if (el && !el.getAttribute('data-testid')) el.setAttribute('data-testid', id);
        };

        setId(
          q('a[href*="#/teachers"],a[href*="/#/teachers"]') || byText(/teachers?/),
          'nav-teacher'
        );
        setId(
          q('a[href*="#/students"],a[href*="/#/students"]') || byText(/students?/),
          'nav-student'
        );
        setId(q('a[href*="#/admin"],a[href*="/#/admin"]') || byText(/admin/), 'nav-admin');
        setId(q('a[href*="#/parent"],a[href*="/#/parent"]') || byText(/parents?/), 'nav-parent');

        // quick summary to console
        const got = ['nav-teacher', 'nav-student', 'nav-admin', 'nav-parent'].reduce(
          (m, id) => ((m[id] = !!document.querySelector(`[data-testid="${id}"]`)), m),
          {}
        );
        console.debug('[nav-shim] stamped', got);
      } catch (e) {
        console.warn('[nav-shim] stamp error', e);
      }
    };

    // Debug markers (visible in console): proves this build has the shim
    window.__navShimVersion = '1.6';
    window.__applyNavStamp = stamp;
    console.debug('[nav-shim] version', window.__navShimVersion);

    // initial + reactive stamping
    stamp();
    const mo = new MutationObserver(stamp);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true });
    window.addEventListener('hashchange', stamp);
    return () => {
      mo.disconnect();
      window.removeEventListener('hashchange', stamp);
    };
  }, []);
  // === /shim ===

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-card-ring bg-bg/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-4">
          <div className="font-semibold">School of the Future PoC</div>
          <StakeholderNav />
          <div className="ml-auto flex items-center gap-2 text-sm">
            <TasksButton onClick={() => setDrawerOpen(true)} />
            <span className="muted">Demo · Mock Data</span>
            <select className="bg-card rounded px-2 py-1 border border-card-ring">
              <option>Class 8</option>
              <option>Class 9</option>
              <option>Class 10</option>
            </select>
            <select className="bg-card rounded px-2 py-1 border border-card-ring">
              <option>Open as…</option>
              <option>Teacher</option>
              <option>Student</option>
              <option>Admin</option>
              <option>Parent</option>
            </select>
          </div>
        </div>
      </header>

      <ScopeBar />

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className={`${hasRail ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          {children}
        </section>

        {hasRail && <aside className="lg:col-span-4 space-y-4">{rightRail}</aside>}
      </main>

      {drawerOpen && <TasksDrawer />}
    </div>
  );
}
