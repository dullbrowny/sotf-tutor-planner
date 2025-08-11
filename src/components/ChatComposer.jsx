import { useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Menu, MenuItem } from '../ui/Menu'

export default function ChatComposer({ onSend, defaultContext }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('Standard')
  const [context, setContext] = useState(
    Array.isArray(defaultContext) ? defaultContext : (defaultContext ? [defaultContext] : [])
  )
  const [files, setFiles] = useState([])
  const fileRef = useRef(null)

  const canSend = text.trim().length > 0

  const send = () => {
    const t = text.trim()
    if (!t) return
    onSend?.(t, { files, context, mode })
    setText('')
    setFiles([])
  }

  const addFiles = (list) => {
    const arr = Array.from(list || [])
    if (!arr.length) return
    setFiles(prev => [...prev, ...arr].slice(0, 5))
  }

  const addInsightContext = () => {
    if (context.some(c => c.type === 'insight')) return
    setContext(prev => [...prev, { type:'insight', label:'Current insight' }])
    setOpen(false)
  }
  const addPageContext = () => {
    if (context.some(c => c.type === 'page')) return
    setContext(prev => [...prev, { type:'page', label:'Left panel context' }])
    setOpen(false)
  }
  const switchMode = (m) => { setMode(m); setOpen(false) }

  return (
    <div className="card p-3 sticky bottom-0">
      {(context.length > 0 || files.length > 0 || mode !== 'Standard') && (
        <div className="mb-2 flex flex-wrap gap-2">
          {context.map((c, idx) => (
            <Chip key={idx} onRemove={() => setContext(context.filter((_,i)=>i!==idx))}>
              {c.type === 'insight' ? '📌' : '📎'} {c.label}
            </Chip>
          ))}
          {files.map((f, idx) => (
            <Chip key={idx} onRemove={() => setFiles(files.filter((_,i)=>i!==idx))}>
              🗂 {f.name}
            </Chip>
          ))}
          {mode !== 'Standard' && <Chip onRemove={() => setMode('Standard')}>⚙️ {mode}</Chip>}
        </div>
      )}

      <div className="flex items-end gap-2 relative">
        <button
          aria-label="Add"
          className="btn-ghost h-11 w-11 rounded-full flex items-center justify-center"
          onClick={() => setOpen(v=>!v)}
        >+</button>

        <Menu open={open} onClose={() => setOpen(false)}>
          <MenuItem onClick={() => fileRef.current?.click()}>Attach file…</MenuItem>
          <MenuItem onClick={addInsightContext}>Attach current insight</MenuItem>
          <MenuItem onClick={addPageContext}>Attach page context</MenuItem>
          <div className="mt-1 border-t border-card-ring my-1"></div>
          <MenuItem onClick={() => switchMode('Explain')}>Mode: Explain</MenuItem>
          <MenuItem onClick={() => switchMode('Plan')}>Mode: Plan</MenuItem>
          <MenuItem onClick={() => switchMode('Draft message')}>Mode: Draft message</MenuItem>
        </Menu>

        <textarea
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="Ask anything…"
          className="flex-1 bg-card border border-card-ring rounded px-3 py-2 h-11 text-sm outline-none resize-none"
          onKeyDown={(e)=>{
            const meta = (e.metaKey || e.ctrlKey) && e.key === 'Enter'
            if (meta) { e.preventDefault(); send() }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
          }}
        />

        <button className="btn-ghost h-11 px-3" title="Voice (placeholder)">🎙️</button>
        <Button onClick={send} disabled={!canSend}>{canSend ? 'Send' : 'Send'}</Button>

        <input ref={fileRef} type="file" className="hidden" multiple onChange={e => addFiles(e.target.files)} />
      </div>
    </div>
  )
}
