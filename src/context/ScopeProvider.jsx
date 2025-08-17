import React, { createContext, useContext, useMemo, useState } from "react";

/** --- Seeds: strictly CBSE 8–10 --- */
const classesSeed = [
  { id: "8A", name: "Class 8A", grade: "8", teacherIds: ["t-1"], studentIds: ["s-arya"] },
  { id: "9A", name: "Class 9A", grade: "9", teacherIds: ["t-2"], studentIds: [] },
  { id: "10A", name: "Class 10A", grade: "10", teacherIds: ["t-3"], studentIds: [] },
];

const teacherGroupsSeed = [
  { id: "tg-8a", name: "Science – 8A", classId: "8A" },
  { id: "tg-9a", name: "Science – 9A", classId: "9A" },
  { id: "tg-10a", name: "Science – 10A", classId: "10A" },
];

const parentGroupsSeed = [
  { id: "pg-8a", name: "Parents of 8A", classId: "8A" },
  { id: "pg-9a", name: "Parents of 9A", classId: "9A" },
  { id: "pg-10a", name: "Parents of 10A", classId: "10A" },
];

/** Safe default so destructuring never explodes */
const defaultCtx = {
  scope: { kind: "student", studentId: null, grade: "8" },
  setScope: () => {},
  classes: [],
  teacherGroups: [],
  parentGroups: [],
  groups: { classes: [], teacherGroups: [], parentGroups: [] },
};

const ScopeCtx = createContext(defaultCtx);

export function ScopeProvider({ children }) {
  // Demo default: specific student in Class 8
  const [scope, setScope] = useState({
    kind: "student",
    studentId: "s-arya",
    grade: "8", // legacy field; UI shows “Class”
  });

  const classes = useMemo(() => classesSeed, []);
  const teacherGroups = useMemo(() => teacherGroupsSeed, []);
  const parentGroups = useMemo(() => parentGroupsSeed, []);

  // Make `groups` always defined and resilient:
  // - existing keys return the seed arrays
  // - unknown keys return [] (prevents "Cannot read properties of undefined")
  const groups = useMemo(() => {
    const base = { classes, teacherGroups, parentGroups };
    return new Proxy(base, {
      get(target, prop) {
        const v = target[prop];
        if (Array.isArray(v)) return v;
        if (prop in target) return v;
        return []; // default empty array for any missing group key
      },
    });
  }, [classes, teacherGroups, parentGroups]);

  const value = useMemo(
    () => ({ scope, setScope, classes, teacherGroups, parentGroups, groups }),
    [scope, classes, teacherGroups, parentGroups, groups]
  );

  return <ScopeCtx.Provider value={value}>{children}</ScopeCtx.Provider>;
}

export function useScope() {
  return useContext(ScopeCtx);
}

