import StakeholderNav from '../components/StakeholderNav'
import ScopeBar from '../components/ScopeBar'
import TasksDrawer from '../components/TasksDrawer'
import TasksButton from '../components/TasksButton'
import { useState } from 'react'

export default function Shell({ children, rightRail }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hasRail = !!rightRail

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
              <option>Class 8</option><option>Class 9</option><option>Class 10</option>
            </select>
            <select className="bg-card rounded px-2 py-1 border border-card-ring">
              <option>Open as…</option>
              <option>Teacher</option><option>Student</option>
              <option>Admin</option><option>Parent</option>
            </select>
          </div>
        </div>
      </header>

      <ScopeBar />

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className={`${hasRail ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          {children}
        </section>

        {hasRail && (
          <aside className="lg:col-span-4 space-y-4">
            {rightRail}
          </aside>
        )}
      </main>

      {drawerOpen && <TasksDrawer />}
    </div>
  );
}

