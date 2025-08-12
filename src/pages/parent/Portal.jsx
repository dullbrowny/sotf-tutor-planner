import React, { useEffect, useMemo, useState } from "react";
import { useScope } from "../../context/ScopeProvider";
import { getAssignmentsForClass, getItemStatus } from "../../state/assignments";
import CitationLink from "../../components/CitationLink";
import { Card } from "../../ui/Card";
import { getParentNoticesForClass } from "../../state/flags";
import { sendNudge, escalateToAdmin } from "../../state/nudges";

function isDueToday(iso) {
  const d = new Date(iso), now = new Date();
  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
}

function resolveParentClassId({ scope, parentGroups = [], classes = [] }) {
  if (scope?.kind === "class" && scope.classId) return scope.classId;
  if (scope?.kind === "parentGroup" && scope.groupId) {
    const g = parentGroups.find(x => x.id === scope.groupId);
    if (g?.classId) return g.classId;
    const token = (g?.name || "").match(/\b(8|9|10)\s*-?\s*([A-Z])\b/i);
    if (token) {
      const guess = `${token[1]}${token[2].toUpperCase()}`;
      const byName = classes.find(c => (c.name || "").toUpperCase().includes(guess));
      if (byName) return byName.id;
      const byId = classes.find(c => String(c.id).toUpperCase() === guess);
      if (byId) return byId.id;
    }
  }
  return classes[0]?.id || "8A";
}

function Donut({ done, total }) {
  const r = 14, c = 2*Math.PI*r;
  const frac = total ? done/total : 0;
  const dash = `${Math.max(frac*c,0.01)} ${c}`;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} className="fill-none stroke-slate-700" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} className="fill-none stroke-emerald-400" strokeWidth="4" strokeDasharray={dash} transform="rotate(-90 20 20)" />
      <text x="20" y="22" textAnchor="middle" className="fill-slate-200 text-xs">{done}/{total}</text>
    </svg>
  );
}

export default function ParentPortal() {
  const { scope, parentGroups = [], classes = [] } = useScope();
  const groupId = scope?.groupId || "pg-8a";
  const classId = useMemo(() => resolveParentClassId({ scope, parentGroups, classes }), [scope, parentGroups, classes]);

  const [due, setDue] = useState(null);
  useEffect(() => {
    const list = getAssignmentsForClass(classId).filter(a => isDueToday(a.dueISO));
    setDue(list[0] || null);
  }, [classId]);

  const studentId = "s-arya";

  function doSendNudge() {
    const n = sendNudge({ fromParentGroup: groupId, toStudentId: studentId, text: "Please finish today’s plan." });
    alert(`✅ Nudge sent to student (${n.id})`);
  }
  function doEscalate() {
    const r = escalateToAdmin({ fromParentGroup: groupId, classId, text: "Request teacher feedback on progress." });
    alert(`✅ Request sent to Admin (${r.id})`);
  }
  function doPraise() {
    const n = sendNudge({ fromParentGroup: groupId, toStudentId: studentId, text: "Great work today! Proud of you 👏" });
    alert(`🎉 Praise sent (${n.id})`);
  }

  const totals = useMemo(() => {
    if (!due) return { done: 0, total: 0 };
    const m = JSON.parse(localStorage.getItem("sotf.attempts.v1") || "{}");
    let done = 0, total = due.items.length;
    due.items.forEach(it => { if (m[`${due.id}:${it.id}`] === "done") done++; });
    return { done, total };
  }, [due]);

  return (
    <>
      <Card title="Home Plan (~20 min)">
        {!due && <div className="text-sm text-slate-400">No assigned plan for today yet.</div>}
        {due && (
          <>
            <div className="mb-3 flex items-center gap-3">
              <Donut done={totals.done} total={totals.total} />
              <div className="text-sm text-slate-300">
                Completion today: <b>{totals.done}/{totals.total}</b>
              </div>
              {import.meta.env.VITE_USE_MOCKS === '1' && totals.total>0 && totals.done===totals.total && (
                <button className="btn-secondary ml-auto" onClick={doPraise}>Send praise</button>
              )}
            </div>

            <div className="space-y-2">
              {due.items.map(x => (
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
                    <span className="text-xs text-slate-400">
                      Est. {x.estMinutes} min · {getItemStatus(due.id, x.id)}
                    </span>
                    {x?.citation && <CitationLink refObj={x.citation} />}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {import.meta.env.VITE_USE_MOCKS === '1' && (
        <>
          <Card title="Family Actions (stub)">
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={doSendNudge}>Send Study Nudge</button>
              <button className="btn-secondary" onClick={doEscalate}>Escalate to Admin</button>
            </div>
          </Card>

          <Card title="School Notices (stub)">
            {(() => {
              const notices = getParentNoticesForClass(classId);
              if (!notices.length) return <div className="text-sm text-slate-400">No notices yet.</div>;
              return (
                <ul className="list-disc pl-5 text-sm">
                  {notices.map(n => <li key={n.id}>{n.kind}: {n.text}</li>)}
                </ul>
              );
            })()}
          </Card>
        </>
      )}
    </>
  );
}

