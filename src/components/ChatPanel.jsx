// src/components/ChatPanel.jsx
import { useState } from 'react'
import { Card } from '../ui/Card'

export default function ChatPanel({ selectedInsights = [], onAction, placeholder }) {
  const [text, setText] = useState('')
  const hint = placeholder || 'Ask anything...'

  const onSend = () => {
    if (!text.trim()) return;
    alert(`(Stub) Chat sent with context:\n\n${selectedInsights.map(s => `• ${s.title}`).join('\n')}\n\nMessage: ${text}`)
    setText('')
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

      <div className="flex items-center gap-2 mb-2">
        <button className="btn-ghost" title="Attach file">+</button>
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

