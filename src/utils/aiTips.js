export function aiTipsForStep(step, profile = {}, recent = {}) {
  const tips = [];
  if (!step) return tips;

  const style = profile.style || 'visual';
  const gaps = new Set(profile.gaps || []);

  // Style alignment
  if (step.mode && step.mode !== style) {
    tips.push(`Try a ${style} aid to match your preference.`);
  } else if (step.mode === style) {
    tips.push(`Good fit for your ${style} style—keep going.`);
  }

  // Gap-aware hints (fractions)
  if ([...gaps].some(g => /fraction/i.test(g))) {
    if (/intro|practice/.test(step.type || '')) tips.push('Anchor on unit fractions (1/n) before composite ones.');
    tips.push('Use number line checkpoints: 0, 1/2, 1.');
  }

  // Performance nudges
  if ((recent.wrongStreak || 0) >= 2) tips.push('Pause and compare to a worked example before retrying.');
  if (recent.slow) tips.push('Set a 2-minute focus timer for this step.');
  if (step.type === 'assessment') tips.push('Explain your reasoning in one sentence before submitting.');

  return Array.from(new Set(tips)).slice(0, 3);
}

