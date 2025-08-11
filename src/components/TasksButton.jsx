import { useEffect, useState } from 'react'
import { listTasks, onTasksChange } from '../store/tasks'

export default function TasksButton({ onClick }) {
  const [count, setCount] = useState(listTasks().length)
  useEffect(() => onTasksChange(() => setCount(listTasks().length)), [])
  return (
    <button className="btn-ghost relative" onClick={onClick} title="View tasks">
      Tasks
      <span className="ml-2 inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-black">
        {count}
      </span>
    </button>
  )
}
