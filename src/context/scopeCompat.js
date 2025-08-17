import { useScope as useRawScope } from "./ScopeProvider";

/**
 * Back-compat wrapper:
 * - guarantees ctx.groups exists
 * - guarantees classes/teacherGroups/parentGroups are arrays
 * - normalizes legacy "grade" → UI label handles this already
 */
export function useScopeCompat() {
  const ctx = useRawScope() || {};
  const groups = ctx.groups || {};

  const classes = Array.isArray(ctx.classes) ? ctx.classes
                 : Array.isArray(groups.classes) ? groups.classes
                 : [];

  const teacherGroups = Array.isArray(ctx.teacherGroups) ? ctx.teacherGroups
                       : Array.isArray(groups.teacherGroups) ? groups.teacherGroups
                       : [];

  const parentGroups = Array.isArray(ctx.parentGroups) ? ctx.parentGroups
                      : Array.isArray(groups.parentGroups) ? groups.parentGroups
                      : [];

  return {
    ...ctx,
    classes,
    teacherGroups,
    parentGroups,
    groups: { classes, teacherGroups, parentGroups },
  };
}

