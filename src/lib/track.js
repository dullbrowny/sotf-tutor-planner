// src/lib/track.js

// LocalStorage keys (must match context)
const EVENTS_KEY = 'sof.events.v1';
const TODAY_KEY = 'sof.today.v1';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * track(name, payload)
 * - Appends an event to the append-only log 'sof.events.v1'
 * - Adds { name, ts } automatically if ts missing.
 */
export function track(name, payload = {}) {
  const events = readJSON(EVENTS_KEY, []);
  const evt = {
    name,
    ts: typeof payload.ts === 'number' ? payload.ts : Date.now(),
    ...payload,
  };
  // Ensure name is present (payload may have name; override with arg)
  evt.name = name;
  events.push(evt);
  writeJSON(EVENTS_KEY, events);
  return evt;
}

/**
 * useEvents()
 * - Aggregates completion by class/subject/date from today+events.
 * - Returns an object with:
 *    {
 *      byKey: Record<key, {
 *        date, classId, subjectId,
 *        totalSections,
 *        todo, in_progress, done,
 *        completionPct, startedPct, doneCount,
 *        updatedTs // latest event or today save we can infer
 *      }>,
 *      last5Plans: Array<{ planId, classId, subjectId, date, completionPct }>,
 *      raw: { events, todayIndex }
 *    }
 *
 * Notes:
 * - Primary truth for status is Today.sections[].status (persisted).
 * - Events help compute "updatedTs" (most recent activity).
 */
export function useEvents() {
  const events = readJSON(EVENTS_KEY, []);
  const todayIndex = readJSON(TODAY_KEY, {}); // Record<studentId, Today[]>

  // Build a summary keyed by date|classId|subjectId
  const byKey = Object.create(null);
  const planCompletion = new Map(); // planId -> {sumDone, sumTotal, classId, subjectId, date}

  for (const [studentId, list] of Object.entries(todayIndex)) {
    for (const t of list || []) {
      const key = `${t.date}|${t.classId}|${t.subjectId || 'NA'}`;
      const rec = (byKey[key] ||= {
        date: t.date,
        classId: t.classId,
        subjectId: t.subjectId || 'NA',
        totalSections: 0,
        todo: 0,
        in_progress: 0,
        done: 0,
        completionPct: 0,
        startedPct: 0,
        doneCount: 0,
        updatedTs: 0,
      });

      const sections = t.sections || [];
      rec.totalSections += sections.length;

      let perPlanDone = 0;
      for (const s of sections) {
        if (s.status === 'done') {
          rec.done += 1;
          perPlanDone += 1;
        } else if (s.status === 'in_progress') {
          rec.in_progress += 1;
        } else {
          rec.todo += 1;
        }
      }

      rec.doneCount += perPlanDone;

      // For last-5 sparkline later
      const pc = planCompletion.get(t.planId) || {
        sumDone: 0,
        sumTotal: 0,
        classId: t.classId,
        subjectId: t.subjectId || 'NA',
        date: t.date,
        planId: t.planId,
      };
      pc.sumDone += perPlanDone;
      pc.sumTotal += sections.length;
      planCompletion.set(t.planId, pc);
    }
  }

  // Use events to find latest update timestamps per key
  for (const e of events) {
    // We can’t directly know class/subject/date from events alone,
    // so best-effort infer by looking up the Today that matches (studentId, planId)
    const { studentId, planId } = e;
    if (!studentId || !planId) continue;
    const list = todayIndex[studentId] || [];
    const t = list.find(x => x.planId === planId);
    if (!t) continue;
    const key = `${t.date}|${t.classId}|${t.subjectId || 'NA'}`;
    const rec = byKey[key];
    if (rec) {
      rec.updatedTs = Math.max(rec.updatedTs, e.ts || 0);
    }
  }

  // Compute percentages
  for (const rec of Object.values(byKey)) {
    const started = rec.in_progress + rec.done;
    const total = Math.max(1, rec.totalSections);
    rec.completionPct = Math.round((rec.done / total) * 100);
    rec.startedPct = Math.round((started / total) * 100);
  }

  // Compute "last 5 published plans" by date (descending) using planCompletion
  const last5Plans = Array.from(planCompletion.values())
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
    .slice(0, 5)
    .map(p => ({
      planId: p.planId,
      classId: p.classId,
      subjectId: p.subjectId,
      date: p.date,
      completionPct: p.sumTotal ? Math.round((p.sumDone / p.sumTotal) * 100) : 0,
    }));

  return { byKey, last5Plans, raw: { events, todayIndex } };
}

