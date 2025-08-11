/**
 * Minimal context-aware insight generator (demo rules).
 * ctx: { key: "students/playback", section, page, scopeKind }
 * scopeMeta: (optional) extra info to shape messages later
 */
function base(id, title, detail, actions, audience, contexts, scopes) {
  return { id, title, detail, actions, audience, contexts, scopes };
}

export function generateInsights(ctx, scopeMeta = {}) {
  const out = [];
  const k = ctx.key;

  if (k === 'students/playback') {
    out.push(
      base('g_stu_pbk_1', 'Time-on-task dipped in Step 2',
        'Student paused twice in the game step—consider a shorter retry.',
        ['Assign Practice Set', 'Draft Message to Teacher'],
        ['students'], ['students/playback'], ['student'])
    );
    out.push(
      base('g_stu_pbk_2', 'Struggle in equivalent fractions',
        'Accuracy < 60% in last 2 attempts. Offer a visual-first intro.',
        ['Add Visual Intro', 'Open Mini-lesson'],
        ['students','teachers'], ['students/playback','teachers/lesson-planning'], ['student','class'])
    );
  }

  if (k === 'teachers/lesson-planning') {
    out.push(
      base('g_tch_lp_1', 'Many students weak on equivalent fractions',
        '41% below mastery in 7B. Start with visual intro.',
        ['Add Visual Intro', 'Post to Class Feed'],
        ['teachers'], ['teachers/lesson-planning'], ['class','teacherGroup'])
    );
  }

  if (k === 'teachers/dashboard') {
    out.push(
      base('g_tch_dash_1', 'Grading backlog rising',
        'You have 12 submissions pending across 7B/7C.',
        ['Open Grading Queue', 'Send Reminder to Students'],
        ['teachers'], ['teachers/dashboard'], ['teacherGroup'])
    );
  }

  if (k === 'admin/overview') {
    out.push(
      base('g_adm_ovw_1', 'Grade 7 Science pass-rate trending down',
        '−8% vs last term; cluster in sections 7B/7C.',
        ['Schedule Dept Review', 'Create Intervention Plan'],
        ['admin'], ['admin/overview'], ['school'])
    );
  }

  if (k === 'parent/portal') {
    out.push(
      base('g_par_port_1', 'Homework missing twice this week',
        'Try a 15-minute evening check-in routine.',
        ['Send Parent Nudge', 'Schedule Teacher Call'],
        ['parents'], ['parent/portal'], ['parentGroup','student'])
    );
  }

  if (!out.length) {
    out.push(
      base('g_generic_1', 'No new insights yet',
        'Explore actions or change scope to see more.',
        ['Refresh Insights', 'Post to Class Feed'],
        [ctx.section], [k], [ctx.scopeKind || 'school'])
    );
  }
  return out;
}
