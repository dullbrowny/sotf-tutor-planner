import React, { useEffect, useState } from "react";
import { useScope } from "../../context/ScopeProvider";
import { getAssignmentsForClass, getAssignmentsForStudent, getItemStatus, recordAttempt } from "../../state/assignments";
import CitationLink from "../../components/CitationLink";
import { api } from "../../api";
import { Card } from "../../ui/Card";
import { getFlagsForStudent } from "../../state/flags";
import { getNudgesForStudent } from "../../state/nudges";

function isDueToday(iso) {
  const d = new Date(iso), now = new Date();
  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
}

export default function StudentDashboard() {
  const { scope, classes = [] } = useScope();
  const studentId = scope?.studentId || "s-arya";

  const [assigned, setAssigned] = useState([]);
  const [today, setToday] = useState([]);

  useEffect(() => {
    let list = [];
    if (scope?.kind === "class" && scope.classId) {
      list = getAssignmentsForClass(scope.classId);
    } else {
      list = getAssignmentsForStudent(studentId, classes);
    }
    setAssigned(list.filter(a => isDueToday(a.dueISO)));
  }, [scope?.kind, scope?.classId, studentId, classes]);

  useEffect(() => {
    const los = api.cbse?.getLOs({ klass: 8, subject: "Math" }) || [];
    const loIds = los.slice(0, 2).map(x => x.id);
    const ex = api.cbse?.getExercisesByLO(loIds, { limit: 6 }) || [];
    setToday(ex);
  }, []);

  function startSession(a) {
    if (a.items?.[0]) recordAttempt({ assignmentId: a.id, itemId: a.items[0].id, status: "inprogress" });
    window.location.hash = `#/students/play/${a.id}`;
  }

  return (
    <>
      {assigned.map(a => (
        <Card key={a.id} title={`Assigned · due today · ${a.subject}`}>
          <div className="flex justify-end">
            <button className="btn-primary mb-2" onClick={() => startSession(a)}>Start session</button>
          </div>
          <div className="space-y-2">
            {a.items.map(it => {
              const st = getItemStatus(a.id, it.id);
              return (
                <div key={it.id} className="card p-3">
                  <div className="text-sm font-medium">{it.qno} · {it.preview}</div>
                  {(it?.phase) && (
                    <span className="inline-block text-[10px] px-2 py-[2px] rounded-full border border-slate-600 text-slate-300 uppercase tracking-wide mt-1">
                      {it.phase}
                    </span>
                  )}
                  {it.chapterRef && (
                    <div className="text-[11px] text-slate-400 mt-1">
                      Chapter: <span className="font-medium">{it.chapterRef.chapterName}</span>
                      {it.chapterRef.page ? <> · p.{it.chapterRef.page}</> : null}
                      {it.chapterRef.url ? <> · <a className="underline" href={it.chapterRef.url} target="_blank" rel="noreferrer">source</a></> : null}
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Est. {it.estMinutes} min · <span className="capitalize">{st}</span>
                    </div>
                    {it?.citation && <CitationLink refObj={it.citation} />}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button className="btn-secondary"
                      onClick={() => { recordAttempt({ assignmentId: a.id, itemId: it.id, status: "inprogress" }); setAssigned(prev => [...prev]); }}>
                      Start
                    </button>
                    <button className="btn-primary"
                      onClick={() => { recordAttempt({ assignmentId: a.id, itemId: it.id, status: "done" }); setAssigned(prev => [...prev]); }}>
                      Mark Done
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <Card title="Today’s 20 (CBSE)">
        <div className="space-y-2">
          {today.map(x => (
            <div key={x.id} className="card p-3">
              <div className="text-sm font-medium">{x.qno} · {x.preview}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">Est. {x.estMinutes} min</span>
                {x?.citation && <CitationLink refObj={x.citation} />}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {import.meta.env.VITE_USE_MOCKS === '1' && (
        <>
          <Card title="Alerts (stub) · At-risk flags">
            {(() => {
              const flags = getFlagsForStudent(studentId);
              if (!flags.length) return <div className="text-sm text-slate-400">No alerts.</div>;
              return (
                <ul className="list-disc pl-5 text-sm">
                  {flags.map(f => <li key={f.id}>{f.kind}: {f.text}</li>)}
                </ul>
              );
            })()}
          </Card>

          <Card title="Nudges from Parents (stub)">
            {(() => {
              const nudges = getNudgesForStudent(studentId);
              if (!nudges.length) return <div className="text-sm text-slate-400">No nudges yet.</div>;
              return (
                <ul className="list-disc pl-5 text-sm">
                  {nudges.map(n => <li key={n.id}>{n.text}</li>)}
                </ul>
              );
            })()}
          </Card>
        </>
      )}
    </>
  );
}

