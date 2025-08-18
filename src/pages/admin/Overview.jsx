import React, { useEffect, useMemo, useState } from "react";
import Card from "../../ui/Card.jsx";
import Button from "../../ui/Button.jsx";
import InsightsRail from "../../components/InsightsRail.jsx";
import ChatPanel from "../../components/ChatPanel.jsx";
import ClassFeedCard from "../../components/ClassFeedCard.jsx";

/* ---------- utils ---------- */
const readJSON = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const todayISO = () => new Date().toISOString().slice(0,10);
const download = (filename, dataObj) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

function flattenToday() {
  const byStudent = readJSON("sof.today.v1", {});
  const all = [];
  for (const [studentId, arr] of Object.entries(byStudent || {})) (arr || []).forEach(t => all.push({ studentId, ...t }));
  return all;
}
function readEvents() { return readJSON("sof.events.v1", []); }
const countSubmissionsToday = (evts) => (evts || []).filter(e => e.name === "attempt.completed" && (new Date(e.ts)).toISOString().slice(0,10) === todayISO()).length;
const countLiveEventsToday   = (evts) => (evts || []).filter(e => (new Date(e.ts)).toISOString().slice(0,10) === todayISO()).length;
const countActiveStudentsToday = (allToday) => new Set((allToday || []).filter(t => t.date === todayISO()).map(t => t.studentId)).size;

/* coverage snapshot (demo) */
const COVERAGE_ROWS = [
  { cls: "Class 8", subject: "Math",     los: 2, ex: 2 },
  { cls: "Class 8", subject: "Science",  los: 0, ex: 0 },
  { cls: "Class 9", subject: "Math",     los: 0, ex: 0 },
  { cls: "Class 9", subject: "Science",  los: 2, ex: 1 },
  { cls: "Class 10", subject: "Math",    los: 2, ex: 1 },
  { cls: "Class 10", subject: "Science", los: 0, ex: 0 },
];

/* insights from KPIs */
function generateOverviewInsights({ submissionsToday, liveEvents, activeStudents }) {
  const out = [];
  if (submissionsToday === 0) {
    out.push({
      id: "no-submissions",
      title: "Submissions today",
      body: "No student submissions yet — consider a reminder for active cohorts.",
      action: { label: "Open Responses", href: "#/teachers/lesson-planning?tab=responses" }
    });
  }
  if (liveEvents > 20) {
    out.push({
      id: "high-activity",
      title: "High activity spike",
      body: "Lots of in-flight work in the last few hours — watch the return queue.",
      action: { label: "Open Inbox", href: "#/teachers/lesson-planning?tab=inbox" }
    });
  }
  if (activeStudents < 1) {
    out.push({
      id: "no-activity",
      title: "No active students",
      body: "No one has opened Today yet. Share handout links or post a nudge.",
      action: { label: "Post to Class Feed", href: "#/teachers/lesson-planning" }
    });
  }
  return out;
}

/* reset/export controls */
function DemoResetPanel({ compact=false }) {
  const [toast, setToast] = useState("");
  const resetToday = () => {
    localStorage.removeItem("sof.today.v1");
    localStorage.removeItem("sof.events.v1");
    setToast("Cleared sof.today.v1 (and sof.events.v1)");
    setTimeout(() => setToast(""), 1600);
  };
  const resetAll = () => {
    ["sof.today.v1","sof.events.v1","sof.lessonPlans.v1"].forEach(k => localStorage.removeItem(k));
    setToast("Cleared today, events, lesson plans");
    setTimeout(() => setToast(""), 1600);
  };
  const exportState = () => {
    download(`sotf-state-${Date.now()}.json`, {
      today: readJSON("sof.today.v1", {}),
      events: readJSON("sof.events.v1", []),
      plans: readJSON("sof.lessonPlans.v1", []),
    });
  };
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mt-2"}`}>
      <Button variant="warning" className="bg-amber-600 hover:bg-amber-500 text-black" onClick={resetToday}>Reset Today</Button>
      <Button variant="danger" onClick={resetAll}>Reset ALL</Button>
      <Button variant="secondary" onClick={exportState}>Export state</Button>
      {toast && <span className="text-xs text-slate-400 ml-2">{toast}</span>}
    </div>
  );
}

/* remediation block (now in RIGHT rail) */
function RemediationPanel({ insight }) {
  const [toast, setToast] = useState("");
  if (!insight) return null;

  const seedChat = (text) => {
    try { window.dispatchEvent(new CustomEvent("sotf.chat.seed", { detail: { text } })); } catch {}
    try { navigator.clipboard.writeText(text); } catch {}
    setToast("Prompt sent to chat (and copied).");
    setTimeout(() => setToast(""), 1600);
  };

  const prompt = (() => {
    if (insight.id === "no-submissions") {
      return "Draft a short, kind reminder to Class 8 English students about today’s assignment; include where to find the handout and how to submit.";
    }
    if (insight.id === "high-activity") {
      return "Suggest a triage plan for a spike in submissions: what to review first and how to batch feedback efficiently.";
    }
    if (insight.id === "no-activity") {
      return "Draft a nudge telling students where to find Today’s tasks and a one-line get-started tip.";
    }
    return `Help with: ${insight.title}. Propose 2–3 concrete next steps.`;
  })();

  return (
    <Card title="Remediation">
      <div className="text-slate-200 font-medium">{insight.title}</div>
      <div className="text-slate-400 text-sm mt-1">{insight.body}</div>
      <div className="flex flex-wrap gap-2 mt-4">
        {insight.action?.href && (
          <Button onClick={() => (window.location.hash = insight.action.href)}>
            {insight.action.label}
          </Button>
        )}
        <Button variant="secondary" onClick={() => seedChat(prompt)}>Ask in Chat</Button>
        <Button variant="ghost" onClick={() => seedChat("Summarize the last 24h of student activity and flag anomalies.")}>
          Summarize activity
        </Button>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        Tip: the Chat panel picks up seeded prompts; if not, paste — it’s on your clipboard.
        {toast && <span className="ml-2 text-slate-400">{toast}</span>}
      </div>
    </Card>
  );
}

/* RIGHT rail wrapper: Insights → Chat → Feed → Remediation */
function RightRail({ insights, onSelect, selectedInsight }) {
  return (
    <div className="col-span-12 xl:col-span-4 space-y-4">
      <InsightsRail
        title="AI Insights"
        insights={insights}
        onAction={(a) => a?.href && (window.location.hash = a.href)}
        onSelect={onSelect}
      />
      <ChatPanel title="Chat" scope="Context" />
      <ClassFeedCard />
      <RemediationPanel insight={selectedInsight} />
    </div>
  );
}

/* ---------- PAGE ---------- */
export default function Overview() {
  const allToday = useMemo(() => flattenToday(), []);
  const events   = useMemo(() => readEvents(), []);
  const submissionsToday = useMemo(() => countSubmissionsToday(events), [events]);
  const liveEvents       = useMemo(() => countLiveEventsToday(events), [events]);
  const activeStudents   = useMemo(() => countActiveStudentsToday(allToday), [allToday]);

  const insights = useMemo(
    () => generateOverviewInsights({ submissionsToday, liveEvents, activeStudents }),
    [submissionsToday, liveEvents, activeStudents]
  );

  const [selectedInsight, setSelectedInsight] = useState(null);
  useEffect(() => { setSelectedInsight((prev) => prev || insights[0] || null); }, [insights]);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* MAIN column: no Insights here (prevents duplicate rail) */}
      <div className="col-span-12 xl:col-span-8">
        <Card title="Admin · Overview (CBSE)">
          <div className="text-slate-400 mb-3">
            Coverage snapshot (demo): Classes 8–10 · Math/Science grounded to CBSE pack.
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" title="Add (demo)" className="rounded-full w-9 h-9 text-xl">+</Button>
            <Button variant="ghost" title="Refresh snapshot" className="rounded-full w-9 h-9">⟲</Button>
            <DemoResetPanel compact />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#0f172a] border border-[#1f2937]">
              <div className="text-slate-400 text-sm">Submissions today</div>
              <div className="text-3xl font-semibold">{submissionsToday}</div>
            </div>
            <div className="p-4 rounded-xl bg-[#0f172a] border border-[#1f2937]">
              <div className="text-slate-400 text-sm">Live events today</div>
              <div className="text-3xl font-semibold">{liveEvents}</div>
            </div>
            <div className="p-4 rounded-xl bg-[#0f172a] border border-[#1f2937]">
              <div className="text-slate-400 text-sm">Active students today</div>
              <div className="text-3xl font-semibold">{activeStudents}</div>
            </div>
          </div>

          {/* Coverage */}
          <div className="mt-6">
            <div className="text-lg font-semibold text-slate-200 mb-2">Coverage</div>
            <div className="overflow-hidden rounded-xl border border-[#1f2937]">
              <table className="w-full text-sm">
                <thead className="bg-[#0b1220] text-slate-300">
                  <tr>
                    <th className="text-left px-3 py-2">Class</th>
                    <th className="text-left px-3 py-2">Subject</th>
                    <th className="text-left px-3 py-2">LOs</th>
                    <th className="text-left px-3 py-2">Exercises</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2937]">
                  {COVERAGE_ROWS.map((r, i) => (
                    <tr key={i}
                        className="hover:bg-[#0f172a] cursor-pointer"
                        onClick={() => {
                          const c = encodeURIComponent(r.cls);
                          const s = encodeURIComponent(r.subject);
                          window.location.hash = `#/teachers/lesson-planning?tab=responses&classId=${c}&subjectId=${s}`;
                        }}>
                      <td className="px-3 py-2">{r.cls}</td>
                      <td className="px-3 py-2">{r.subject}</td>
                      <td className="px-3 py-2">{r.los}</td>
                      <td className="px-3 py-2">{r.ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      {/* RIGHT rail: Insights → Chat → Feed → Remediation */}
      <RightRail
        insights={insights}
        selectedInsight={selectedInsight}
        onSelect={(ins) => setSelectedInsight(ins)}
      />
    </div>
  );
}

