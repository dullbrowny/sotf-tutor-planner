import { useEffect, useMemo, useState } from 'react'
import { Card } from '../ui/Card'
import ChatComposer from './ChatComposer'
import { useScope } from '../context/ScopeProvider'

const CHAT_KEY = 'chat:v4'
const load = ()=>{ try{return JSON.parse(localStorage.getItem(CHAT_KEY)||'{}')}catch{return{}} }
const save = (x)=> localStorage.setItem(CHAT_KEY, JSON.stringify(x))

function selectionKey(insights=[]) {
  return insights.map(i=>i.id).sort().join('+') || 'none'
}

export default function ChatPanel({ selectedInsights = [], onAction }) {
  const { scope } = useScope()
  const [store, setStore] = useState(load())
  const key = selectionKey(selectedInsights)
  const messages = useMemo(() => (store[key] || []), [store, key])

  useEffect(() => { setStore(load()) }, [key])

  const handleSend = (text, meta) => {
    if (selectedInsights.length === 0) return
    const next = { ...store }
    const thread = next[key] = (next[key] || [])
    const now = new Date().toISOString()
    thread.push({ id:'m-'+Date.now(), role:'user', text, meta, ts: now })
    const reply = mockReply(selectedInsights, text, scope, meta)
    thread.push({ id:'m-'+(Date.now()+1), role:'assistant', text: reply, ts: new Date().toISOString() })
    setStore(next); save(next)
  }

  const prettyScope = scope.kind[0].toUpperCase() + scope.kind.slice(1)
  const titles = selectedInsights.map(i=>i.title)

  return (
    <Card title="Chat">
      {selectedInsights.length === 0 ? (
        <div className="muted text-sm">Select one or more insights to start a conversation.</div>
      ) : (
        <>
          <div className="muted text-xs mb-2">
            <span className="opacity-80">Scope:</span> {prettyScope}
            <span className="opacity-40 mx-1">•</span>
            <span className="opacity-80">Insights:</span> <span className="text-text">{titles.join(' | ')}</span>
          </div>

          <div className="h-56 overflow-auto space-y-3 mb-2 pr-1">
            {messages.length === 0 ? (
              <div className="muted text-sm">Tip: Ask “Why did these happen?”, “What’s the combined plan?”, or “Draft a message to parents.”</div>
            ) : messages.map(m => (
              <Bubble key={m.id} role={m.role} text={m.text} ts={m.ts} meta={m.meta} />
            ))}
          </div>

          <ChatComposer
            onSend={handleSend}
            defaultContext={[
              { type:'insight', label:`Selected (${selectedInsights.length})` },
              { type:'page', label:'Left panel context' }
            ]}
          />
        </>
      )}
    </Card>
  )
}

function Bubble({ role, text, ts, meta }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
        isUser ? 'bg-accent text-black' : 'bg-bg/50 border border-card-ring text-text'
      }`}>
        <div>{text}</div>
        <div className="flex flex-wrap gap-2 items-center mt-1">
          {meta?.files?.length ? (<span className="text-xs opacity-80">📎 {meta.files.map(f=>f.name).join(', ')}</span>) : null}
          {meta?.mode && meta.mode !== 'Standard' ? (<span className="text-[10px] opacity-70">Mode: {meta.mode}</span>) : null}
          {meta?.context?.length ? (<span className="text-[10px] opacity-70">Context: {meta.context.map(c=>c.label).join(' • ')}</span>) : null}
          <span className="text-[10px] opacity-60 ml-auto">{new Date(ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
      </div>
    </div>
  )
}

function mockReply(insights, text, scope, meta) {
  const titles = insights.map(i=>i.title).join('; ')
  const m = (meta?.mode || 'Standard').toLowerCase()
  if (m.includes('draft')) return `Subject: Update on ${titles}\nBody: Hello, quick update about these items…`
  if (/why|reason|dip|drop/i.test(text)) return 'Combined root causes: reduced practice and attendance gaps in affected weeks. Suggest booster + visual warm-up + practice set.'
  if (/plan|fix|remed|next/i.test(text)) return 'Combined plan: visual intro → 5-item adaptive quiz → targeted practice → follow-up in 3 days, with a class announcement.'
  return `Acknowledged for ${scope.kind}.`
}
