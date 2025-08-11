// src/data/insights.js
const insights = [
  // Students · Playback
  {
    id: 'stu_pbk_001',
    title: 'Time-on-task dipped in Step 2',
    detail: 'Student paused twice during game step; consider a shorter retry.',
    actions: ['Assign Practice Set', 'Draft Message to Teacher'],
    audience: ['students'],
    contexts: ['students/playback'],
    scopes: ['student'],
  },
  {
    id: 'stu_pbk_002',
    title: 'Struggle in equivalent fractions',
    detail: 'Accuracy < 60% in the last 2 attempts. Offer a visual-first intro.',
    actions: ['Add Visual Intro', 'Open Mini-lesson'],
    audience: ['students','teachers'],
    contexts: ['students/playback','teachers/lesson-planning'],
    scopes: ['student','class'],
  },

  // Teachers · Lesson Planning
  {
    id: 'tch_plan_001',
    title: 'Many students weak on equivalent fractions',
    detail: '41% below mastery in 7B. Start with visual intro.',
    actions: ['Add Visual Intro', 'Post to Class Feed'],
    audience: ['teachers'],
    contexts: ['teachers/lesson-planning'],
    scopes: ['class','teacherGroup'],
  },
  {
    id: 'tch_plan_002',
    title: 'Math engagement dropped in Week 3',
    detail: 'Time-on-task fell by 32%. Consider a booster session.',
    actions: ['Schedule Extra Class', 'Send Progress Letter', 'Request Teacher Meeting'],
    audience: ['teachers','admin'],
    contexts: ['teachers/dashboard','admin/overview'],
    scopes: ['class','school','teacherGroup'],
  },

  // Admin · Overview
  {
    id: 'adm_ovw_001',
    title: 'Grade 7 Science pass-rate trending down',
    detail: '−8% vs last term; cluster in sections 7B/7C.',
    actions: ['Schedule Dept Review', 'Create Intervention Plan'],
    audience: ['admin'],
    contexts: ['admin/overview'],
    scopes: ['school'],
  },

  // Parent · Portal
  {
    id: 'par_port_001',
    title: 'Homework missing twice this week',
    detail: 'Suggest a 15-min evening check-in routine.',
    actions: ['Send Parent Nudge', 'Schedule Teacher Call'],
    audience: ['parents'],
    contexts: ['parent/portal'],
    scopes: ['parentGroup','student'],
  },
];

export default insights;

