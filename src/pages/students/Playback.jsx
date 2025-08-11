import { useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { dispatchAction } from '../../agents/dispatcher';
import { aiTipsForStep } from '../../utils/aiTips';

export default function Playback({ planId = 'plan_demo_001' }) {
  // --- Mock plan for demo ---
  const plan = useMemo(() => ({
    id: planId,
    title: 'Fractions · Visual-first Microplan',
    steps: [
      { id: 's1', type: 'intro',      mode: 'visual',   title: 'Number Line Animation', time: '~10 mins', desc: 'Watch the short animation; note how fractions map to the number line.' },
      { id: 's2', type: 'practice',   mode: 'game',     title: 'Fractions Ninja Game',  time: '10 mins',  desc: 'Play one round. Focus on unit fractions first.' },
      { id: 's3', type: 'practice',   mode: 'visual',   title: 'Drag & Drop Worksheet', time: '12 mins',  desc: 'Drag fractions to the correct number line positions.' },
      { id: 's4', type: 'assessment', mode: 'quiz',     title: 'AI Adaptive Quiz',      time: '5 mins',   desc: 'Answer 6 quick questions. Explain your reasoning briefly.' },
    ]
  }), [planId]);

  // --- Local progress (demo only; not persisted) ---
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(() => new Set());

  const steps = plan.steps;
  const step  = steps[idx];
  const total = steps.length;
  const pct   = Math.round((done.size / total) * 100);
  const isDone = step ? done.has(step.id) : false;
  const atLast = idx >= total - 1;

  // --- AI Tips (rules-only) ---
  const mockProfile = { style: 'visual', gaps: ['equivalent fractions'] };
  const mockRecent  = { wrongStreak: step?.type === 'assessment' ? 2 : 0, slow: false };
  const tips = aiTipsForStep(step, mockProfile, mockRecent);

  // --- Actions → Tasks ---
  const askForHelp = async () => {
    await dispatchAction(
      { scope: 'student', planId },
      { type: 'student_help', label: `Student asked for help on "${step?.title}"`, payload: { stepId: step?.id } }
    );
    alert('✅ Help request sent.');
  };

  const sendUpdate = async () => {
    await dispatchAction(
      { scope: 'student', planId },
      { type: 'student_update', label: `Progress update: "${step?.title}"`, payload: { completed: Array.from(done) } }
    );
    alert('✅ Update sent to teacher.');
  };

  // --- Nav helpers ---
  const goTo = (i) => setIdx(Math.max(0, Math.min(total - 1, i)));

  const markDoneAndNext = () => {
    if (!step) return;
    setDone(prev => {
      const nextSet = new Set(prev);
      nextSet.add(step.id);
      return nextSet;
    });
    // auto-advance if not at end
    if (!atLast) goTo(idx + 1);
  };

  const nextOnly = () => { if (!atLast) goTo(idx + 1); };
  const backOnly = () => { if (idx > 0) goTo(idx - 1); };

  return (
    <>
      <Card title={`Student · Playback — ${plan.title}`}>
        {/* Progress */}
        <div className="w-full h-2 rounded bg-slate-800 overflow-hidden mb-2">
          <div className="h-2 bg-rose-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-right text-xs text-slate-300 mb-4">{pct}%</div>

        {/* Step chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {steps.map((st, i) => {
            const active = i === idx;
            const completed = done.has(st.id);
            return (
              <button
                key={st.id}
                className={[
                  'px-3 py-2 rounded-md border',
                  active ? 'border-rose-400 bg-slate-800' : 'border-slate-700 bg-slate-900',
                  'text-slate-100 text-sm flex items-center gap-2'
                ].join(' ')}
                onClick={() => goTo(i)}
              >
                {completed ? <span>✅</span> : <span>🟩</span>}
                <span className="opacity-80 capitalize">{st.type}</span>
                <span className="opacity-60">•</span>
                <span className="opacity-90">{st.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active step */}
        <div className="card p-4">
          <div className="text-xs text-slate-300 mb-1">
            {step?.type && <span className="capitalize">{step.type}</span>} • {step?.mode} • {step?.time || ''}
          </div>
          <div className="text-xl font-semibold mb-2">{step?.title}</div>
          <div className="text-slate-200">{step?.desc}</div>

          {/* AI Tips */}
          {tips?.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700">
              <div className="text-xs uppercase tracking-wide text-slate-300 mb-1">AI Tips</div>
              <ul className="list-disc pl-5 text-sm text-slate-100">
                {tips.map((t, i) => <li key={`tip-${i}`}>{t}</li>)}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn-ghost" onClick={backOnly} disabled={idx === 0}>Back</button>

            {!isDone
              ? <button className="btn-primary" onClick={markDoneAndNext}>Mark done → Next</button>
              : <button className="btn-primary" onClick={nextOnly} disabled={atLast}>Next</button>
            }

            <button className="btn-ghost" onClick={askForHelp}>Ask for help</button>
            <div className="flex-1" />
            <button className="btn-primary" onClick={sendUpdate}>Send update to teacher</button>
          </div>
        </div>

        {/* Footer scope */}
        <div className="mt-4 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50">
          <div className="text-xs text-slate-300">Student: Arya Kapoor · Plan: {planId}</div>
        </div>
      </Card>
    </>
  );
}

