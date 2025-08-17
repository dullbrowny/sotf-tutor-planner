import React, { useMemo } from "react";
import { Card } from "../../ui/Card";
import { useScope } from "../../context/ScopeProvider";
import { getAssignmentsForClass } from "../../state/assignments";

function isToday(iso) {
  const d = new Date(iso), n = new Date();
  return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
}

function getCounts(assignmentId, items) {
  const m = JSON.parse(localStorage.getItem("sotf.attempts.v1") || "{}");
  let started = 0, done = 0;
  items.forEach(it => {
    const st = m[`${assignmentId}:${it.id}`];
    if (st === "inprogress") started++;
    if (st === "done") done++;
  });
  return { total: items.length, started, done };
}

function Sparkline({ total, started, done }) {
  const W = 90, H = 10;
  const toX = (n) => Math.round((n/Math.max(total,1))*W);
  const xStarted = toX(started), xDone = toX(done);
  return (
    <svg width={W} height={H} className="opacity-80">
      {/* baseline */}
      <line x1="0" y1="9" x2={W} y2="9" className="stroke-slate-700" strokeWidth="2" />
      {/* started */}
      <line x1="0" y1="5" x2={xStarted} y2="5" className="stroke-amber-400" strokeWidth="2" />
      {/* done */}
      <line x1="0" y1="1" x2={xDone} y2="1" className="stroke-emerald-400" strokeWidth="2" />
    </svg>
  );
}

export default function TeachersDashboard() {
  const { classes = [] } = useScope();
  const classId = classes[0]?.id || "8A";

  const todays = useMemo(() => {
    return getAssignmentsForClass(classId).filter(a => isToday(a.dueISO));
  }, [classId]);

  return (
    <>
      <Card title="Teacher · Dashboard">
        <div className="text-sm text-slate-300">
          {todays.length ? `Today’s assignments for ${classId}` : "No assignments due today yet."}
        </div>
      </Card>

      {todays.map(a => {
        const counts = getCounts(a.id, a.items);
        return (
          <Card key={a.id} title={`Today · ${a.subject} · ${classId}`}>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300">
                    <th className="py-2 pr-3 w-24">Qno</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3 w-36">Started / Done</th>
                    <th className="py-2 pr-3 w-28">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {a.items.map(it => {
                    const m = JSON.parse(localStorage.getItem("sotf.attempts.v1") || "{}");
                    const st = m[`${a.id}:${it.id}`];
                    const isStarted = st === "inprogress" || st === "done";
                    const isDone = st === "done";
                    return (
                      <tr key={it.id} className="border-t border-slate-800">
                        <td className="py-2 pr-3">{it.qno}</td>
                        <td className="py-2 pr-3">{it.preview}</td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="text-amber-300">{isStarted ? 1 : 0}</span>
                            <span className="opacity-50">/</span>
                            <span className="text-emerald-300">{isDone ? 1 : 0}</span>
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <Sparkline total={1} started={isStarted ? 1 : 0} done={isDone ? 1 : 0} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-800">
                    <td className="py-2 pr-3 text-slate-400" colSpan={2}>Totals</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-amber-300">{counts.started}</span>
                        <span className="opacity-50">/</span>
                        <span className="text-emerald-300">{counts.done}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <Sparkline total={counts.total} started={counts.started} done={counts.done} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        );
      })}
    </>
  );
}

