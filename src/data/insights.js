const insights = [
  {
    id: 'ins-001',
    scope: 'student',
    audience: 'parent',
    title: 'Math engagement dropped in Week 3',
    detail: 'Time-on-task fell by 32%. Consider a booster session.',
    severity: 'warn',
    suggestedActions: [
      { id: 'act-1', label: 'Schedule Extra Class', kind: 'schedule', targets: ['teacher','student'], payload: { duration: 45 }, channel:'calendar' },
      { id: 'act-2', label: 'Send Progress Letter', kind: 'share', targets: ['parent'], channel:'email' },
      { id: 'act-3', label: 'Request Teacher Meeting', kind: 'schedule', targets: ['teacher','parent'], channel:'calendar' }
    ]
  },
  {
    id: 'ins-002',
    scope: 'class',
    audience: 'teacher',
    title: 'Struggle in equivalent fractions (Class 7B)',
    detail: 'Accuracy < 60% for 41% of students. Swap in a visual intro and announce booster.',
    severity: 'warn',
    suggestedActions: [
      { id: 'act-4', label: 'Add Visual Intro', kind: 'generate', targets: ['teacher'] },
      { id: 'act-5', label: 'Assign Practice Set', kind: 'assign', targets: ['student'] },
      { id: 'act-6', label: 'Post to Class Feed', kind: 'post', targets: ['class'], channel:'class-feed', payload:{ message:'Booster session Tue 4pm. Bring notebooks.' } }
    ]
  }
]

export default insights
