import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { getFeed, postToFeed } from '../store/classFeed'

export default function ClassFeedCard({ classId }) {
  const [items, setItems] = useState([])
  const refresh = () => setItems(getFeed(classId))
  useEffect(()=>{ refresh() }, [classId])

  const post = () => {
    const msg = prompt('Post to class feed:', 'Booster session Tue 4pm')
    if (!msg) return
    postToFeed(classId, { kind:'post', message: msg })
    refresh()
  }

  return (
    <Card title="Class Feed" actions={<button className="btn-ghost" onClick={post}>Post</button>}>
      {items.length === 0 ? (
        <div className="muted text-sm">No posts yet.</div>
      ) : (
        <ul className="space-y-2">
          {items.map(it => (
            <li key={it.id} className="rounded-lg border border-card-ring p-2 bg-bg/30 text-sm">
              <div className="opacity-70 text-xs">{new Date(it.ts).toLocaleString()}</div>
              <div>{it.message}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
