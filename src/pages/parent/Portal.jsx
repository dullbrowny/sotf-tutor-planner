import React, { useEffect, useMemo, useState } from "react";
import { useScope } from "../../context/ScopeProvider";
import { getAssignmentsForClass } from "../../state/assignments";
import CitationLink from "../../components/CitationLink";
import { Card } from "../../ui/Card";

function isDueToday(iso) {
  const d = new Date(iso), now = new Date();
  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
}

// Try hard to find the class attached to the selected parent group
function resolveParentClassId({ scope, parentGroups = [], classes = [] }) {
  if (scope?.kind === "class" && scope.classId) return scope.classId;
  if (scope?.kind === "parentGroup" && scope.groupId) {
    const g = parentGroups.find(x => x.id === scope.groupId);
    if (g?.classId) return g.classId;
    // parse "Parents of 8A"
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

export default function ParentPortal() {
  const { scope, parentGroups = [], classes = [] } = useScope();
  const classId = useMemo(() => resolveParentClassId({ scope, parentGroups, classes }), [scope, parentGroups, classes]);

  const [due, setDue] = useState(null);
  useEffect(() => {
    const list = getAssignmentsForClass(classId).filter(a => isDueToday(a.dueISO));
    setDue(list[0] || null);
  }, [classId]);

  return (
    <>
      <Card title="Home Plan (~20 min)">
        {!due && <div className="text-sm text-slate-400">No assigned plan for today yet.</div>}
        {due && (
          <div className="space-y-2">
            {due.items.map(x => (
              <div key={x.id} className="card p-3">
                <div className="text-sm font-medium">{x.qno} · {x.preview}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Est. {x.estMinutes} min</span>
                  {x?.citation && <CitationLink refObj={x.citation} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

