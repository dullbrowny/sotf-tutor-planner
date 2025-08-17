import React, { useEffect, useMemo, useRef, useState } from "react";
import { useScope } from "../context/ScopeProvider";

/* Fallback from route (only if scope not set yet) */
function kindFromHash() {
  const h = (typeof window !== "undefined" ? window.location.hash : "") || "";
  const seg = h.replace(/^#\//, "");
  if (seg.startsWith("students")) return "student";
  if (seg.startsWith("teachers")) return "teacherGroup";
  if (seg.startsWith("parent"))   return "parentGroup";
  if (seg.startsWith("admin"))    return "school";
  return "class";
}

const LABELS = {
  student: "Student",
  class: "Class",
  teacherGroup: "Teacher Group",
  parentGroup: "Parent Group",
  school: "School",
};

export default function ScopeBar({
  allowedKinds = ["student", "class", "teacherGroup", "parentGroup", "school"],
  className = "",
}) {
  const { scope, setScope, classes = [], teacherGroups = [], parentGroups = [] } = useScope();

  // normalize + dedupe kinds; "grade" → "class"
  const kinds = useMemo(() => {
    const norm = (k) => (k === "grade" ? "class" : k);
    return Array.from(new Set((allowedKinds || []).map(norm)));
  }, [allowedKinds]);

  const [kind, setKind] = useState(scope?.kind ? (scope.kind === "grade" ? "class" : scope.kind) : kindFromHash());
  useEffect(() => {
    if (!scope?.kind) return;
    const k = scope.kind === "grade" ? "class" : scope.kind;
    if (k !== kind) setKind(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope?.kind]);

  // Build entity options for the second select
  const entityOptions = useMemo(() => {
    if (kind === "class")
      return classes.map((c) => ({ value: c.id, label: c.name || (c.grade ? `Class ${c.grade}` : c.id), grade: c.grade }));
    if (kind === "teacherGroup")
      return teacherGroups.map((g) => ({ value: g.id, label: g.name || g.id }));
    if (kind === "parentGroup")
      return parentGroups.map((g) => ({ value: g.id, label: g.name || g.id }));
    if (kind === "student") {
      const list = [];
      classes.forEach((c) => (c.studentIds || []).forEach((sid) => list.push({ value: sid, label: sid })));
      return list;
    }
    return [];
  }, [kind, classes, teacherGroups, parentGroups]);

  // Selected entity ID from scope
  const selectedEntityId = useMemo(() => {
    if (kind === "class") return scope?.classId || null;
    if (kind === "teacherGroup" || kind === "parentGroup") return scope?.groupId || null;
    if (kind === "student") return scope?.studentId || null;
    return null;
  }, [kind, scope?.classId, scope?.groupId, scope?.studentId]);

  // Auto-correct stale/invalid selections (e.g., legacy 7B) to first valid option
  useEffect(() => {
    if (!entityOptions.length) return;
    const exists = entityOptions.some((o) => o.value === selectedEntityId);
    if (exists) return;

    const first = entityOptions[0]?.value || null;
    if (!first) return;

    if (kind === "class") {
      const cls = entityOptions[0];
      setScope({ kind: "class", classId: cls.value, grade: cls.grade || scope?.grade || "8" });
    } else if (kind === "teacherGroup" || kind === "parentGroup") {
      setScope({ kind, groupId: first });
    } else if (kind === "student") {
      setScope({ kind: "student", studentId: first });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, entityOptions]);

  const summaryText = useMemo(() => {
    if (kind === "class") {
      const item = classes.find((c) => c.id === selectedEntityId);
      const label = item?.name || (item?.grade ? `Class ${item.grade}` : selectedEntityId || "—");
      return `Class: ${label}`;
    }
    if (kind === "teacherGroup") {
      const item = teacherGroups.find((g) => g.id === selectedEntityId);
      return `Group: ${item?.name || selectedEntityId || "—"}`;
    }
    if (kind === "parentGroup") {
      const item = parentGroups.find((g) => g.id === selectedEntityId);
      return `Group: ${item?.name || selectedEntityId || "—"}`;
    }
    if (kind === "student") return `Student: ${selectedEntityId || "—"}`;
    return `Scope: School`;
  }, [kind, selectedEntityId, classes, teacherGroups, parentGroups]);

  const onKind = (e) => {
    const next = e.target.value === "grade" ? "class" : e.target.value;
    setKind(next);
    if (next === "class") {
      const first = entityOptions[0] || classes[0];
      setScope({ kind: "class", classId: first?.value || first?.id || null, grade: first?.grade || "8" });
    } else if (next === "teacherGroup") {
      const first = (teacherGroups[0] || {}).id || null;
      setScope({ kind: "teacherGroup", groupId: first });
    } else if (next === "parentGroup") {
      const first = (parentGroups[0] || {}).id || null;
      setScope({ kind: "parentGroup", groupId: first });
    } else if (next === "student") {
      let firstStudent = null;
      classes.some((c) => {
        if (c.studentIds?.length) { firstStudent = c.studentIds[0]; return true; }
        return false;
      });
      setScope({ kind: "student", studentId: firstStudent || "s-arya" });
    } else {
      setScope({ kind: "school" });
    }
  };

  const onEntity = (e) => {
    const val = e.target.value || null;
    if (kind === "class") {
      const cls = classes.find((c) => c.id === val);
      setScope({ kind: "class", classId: cls?.id || val, grade: cls?.grade || scope?.grade || "8" });
    } else if (kind === "teacherGroup" || kind === "parentGroup") {
      setScope({ kind, groupId: val });
    } else if (kind === "student") {
      setScope({ kind: "student", studentId: val });
    }
  };

  // ----- Alignment to tab row below -----
  const wrapRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    function align() {
      const wrap = wrapRef.current;
      const inner = innerRef.current;
      if (!wrap || !inner) return;

      // Try common selectors for the tabs row in this page
      const target =
        document.querySelector('[data-page-tabs]') ||
        document.querySelector('[role="tablist"]') ||
        document.querySelector('.module-switcher') ||
        null;

      // Reset first
      inner.style.paddingLeft = "";
      inner.style.paddingRight = "";

      if (!target) return;

      const left = target.getBoundingClientRect().left;
      const wrapLeft = wrap.getBoundingClientRect().left;
      const deltaL = Math.max(0, left - wrapLeft);

      const right = target.getBoundingClientRect().right;
      const wrapRight = wrap.getBoundingClientRect().right;
      const deltaR = Math.max(0, wrapRight - right);

      // Pad so our left edge matches the tabs' left, and keep the right chip aligned
      inner.style.paddingLeft = `${deltaL}px`;
      inner.style.paddingRight = `${deltaR}px`;
    }

    align();
    const ro = new ResizeObserver(align);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  // tokens that match your top-row inputs
  const selectBase =
    "h-9 min-w-[160px] bg-slate-900/50 border border-slate-700 rounded-lg px-2 text-sm " +
    "focus:outline-none focus:ring-1 focus:ring-sky-600";
  const selectEntity = selectBase + " min-w-[200px]";

  return (
    <div ref={wrapRef} className={`w-full mb-3 ${className}`}>
      {/* Contained bar; inner gets dynamic left/right padding to match tabs row */}
      <div ref={innerRef} className="relative rounded-2xl border border-slate-700 bg-slate-900/40 px-4 md:px-6 py-2">
        <div className="grid grid-cols-[auto_auto_1fr] items-center gap-3">
          {/* Left cluster */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 leading-9">Scope:</span>
            <select aria-label="Scope kind" className={selectBase} value={kind} onChange={onKind}>
              {kinds.map((k) => (
                <option key={k} value={k}>{LABELS[k] || k}</option>
              ))}
            </select>
            {kind !== "school" && (
              <select
                aria-label="Scope entity"
                className={selectEntity}
                value={selectedEntityId || ""}
                onChange={onEntity}
              >
                {entityOptions.length === 0 ? (
                  <option value="" disabled>No options</option>
                ) : (
                  entityOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Right scope chip */}
          <div className="col-start-3 justify-self-end">
            <div className="px-3 h-9 flex items-center border border-slate-700 bg-slate-900/60 rounded-lg text-xs text-slate-300">
              {summaryText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

