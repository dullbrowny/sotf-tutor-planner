import { useEffect, useRef } from 'react'
export function Menu({ open, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    function onDoc(e){ if (open && ref.current && !ref.current.contains(e.target)) onClose?.() }
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} className="absolute z-50 mt-2 w-64 card p-2">
      {children}
    </div>
  )
}
export function MenuItem({ onClick, children }) {
  return (
    <button onClick={onClick} className="w-full text-left px-2 py-1 rounded hover:bg-bg/40 text-sm">
      {children}
    </button>
  )
}
