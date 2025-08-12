import React from "react";
import { Card } from "../../ui/Card";
import { useScope } from "../../context/ScopeProvider";
import { getAssignmentsForClass } from "../../state/assignments";

export default function TeachersDashboard() {
  const { classes = [] } = useScope();
  const classId = classes[0]?.id || "8A";

  function summarizeToday() {
    const list = getAssignmentsForClass(classId).filter(a => {
      const d = new Date(a.dueISO), n = new Date();
      return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
    });
    let started = 0, done = 0, total = 0;
    const m = JSON.parse(localStorage.getItem("sotf.attempts.v1") || "{}");
    list.forEach(a => a.items.forEach(it => {
      total++;
      const st = m[`${a.id}:${it.id}`];
      if (st === "inprogress") started++;
      if (st === "done") done++;
    }));
    return { total, started, done };
  }

  const s = summarizeToday();

  return (
    <>
      <Card title="Teacher · Dashboard">
        <div className="text-sm text-slate-300">Welcome back. Pick a class from the Scope bar to get started.</div>
      </Card>

      {import.meta.env.VITE_USE_MOCKS === '1' && (
        <Card title="Student Completion (stub)">
          <div className="text-sm">
            Assigned items today: <b>{s.total}</b> · Started: <b>{s.started}</b> · Done: <b>{s.done}</b>
          </div>
        </Card>
      )}
    </>
  );
}

