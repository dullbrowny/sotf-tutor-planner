import { useMemo, useState } from 'react'
import { Card } from '../ui/Card'

function suggestionsFor(contextKey = 'teachers/dashboard') {
  const m = {
    'teachers/dashboard': [
      'Summarize my grading queue for this week.',
      'Draft a note to parents about upcoming assessments.',
      'Suggest 2 engagement boosters for low-participation classes.'
    ],
    'teachers/lesson-planning': [
      'Auto-build a microplan for equivalent fractions (visual-first).',
      'Revise the intro block to include manipulatives.',
      'Create 5 practice questions aligned to today’s objective.'
    ],
    'students/dashboard': [
      'What should I focus on next to improve fastest?',
      'Why did my accuracy drop this week?',
      'Suggest a 20-min study plan for today.'
    ],
    'students/playback': [
      'Give me a hint for this step.',
      'Explain equivalent fractions with a quick example.',
      'Can I switch this step to a different mode?'
    ],
    'admin/overview': [
      'Which cohorts are trending at-risk and why?',
      'Show top 3 KPIs to watch this week.',
      'Draft an intervention plan outline for Grade 7 science.'
    ],
    'parent/portal': [
      'How is my child doing this week?',
      'What can we do at home to help with fractions?',
      'Schedule a quick check-in with the teacher.'
    ],
  };
  return m[contextKey] || ['Help me with the current page.'];
}

// Added prop: contextKey
export default function ChatPanel({
  selectedInsights = [],
  onAction,
  placeholder,
  contextKey
}) {
  const [text, setText] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const hint = placeholder || 'Ask anything...'

  // TRUST the explicit contextKey from parent; do not infer from placeholder
  const key = useMemo(() => contextKey || 'teachers/dashboard', [contextKey])
  const sugg = suggestionsFor(key)

  const onSend = () => {
    if (!text.trim()) return;
    alert(`(Stub) Chat sent with context:\n\n${selectedInsights.map(s => `• ${s.title}`).join('\n')}\n\nMessage: ${text}`)
    setText('')
  }

  const insert = (s) => {
    setText(prev => (prev ? prev + ' ' : '') + s)
    setShowMenu(false)
  }

  return (
    <Card title="Chat">
      <div className="text-xs text-slate-300 mb-2">
        {selectedInsights.length ? (
          <>Scope: <span className="font-medium">Selected ({selectedInsights.length})</span></>
        ) : (
          <>Scope: <span className="font-medium">Context</span></>
        )}
      </div>

      <div className="relative flex items-center gap-2 mb-2">
        <button
          className="btn-ghost"
          title="Smart prompts"
          onClick={() => setShowMenu(v => !v)}
        >+</button>

        {showMenu && (
          <div className="absolute z-10 top-10 left-0 w-[320px] card p-2 space-y-1">
            <div className="text-xs text-slate-300 mb-1">Suggestions</div>
            {sugg.map((s, i) => (
              <button
                key={`sugg-${i}`}
                className="block w-full text-left px-2 py-1 rounded hover:bg-slate-800 text-sm"
                onClick={() => insert(s)}
              >{s}</button>
            ))}
          </div>
        )}

        <input
          data-testid="chat-input"
          className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
          placeholder={hint}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button className="btn-primary" onClick={onSend}>Send</button>
      </div>
    </Card>
  )
}

