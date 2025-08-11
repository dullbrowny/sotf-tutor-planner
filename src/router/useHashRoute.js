import { useEffect, useState } from 'react'

// Format: #/teachers/assessment
export function useHashRoute() {
  const parse = () => {
    const raw = (window.location.hash || '#/').slice(1)
    const parts = raw.split('/').filter(Boolean)
    return { path: '/' + parts.join('/'), parts }
  }
  const [route, setRoute] = useState(parse())
  useEffect(() => {
    const onHash = () => setRoute(parse())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const navigate = (to) => { window.location.hash = to.startsWith('#') ? to : ('#' + to) }
  return { ...route, navigate }
}
