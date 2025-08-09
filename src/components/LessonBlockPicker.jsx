import blocks from '../data/lessonBlocks.json'

export default function LessonBlockPicker({ onAdd }) {
  return (
    <div className="card p-4">
      <h2 className="panel-title mb-3">Build Your Plan</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(blocks).map(([stage, items]) => (
          <div key={stage} className="bg-card rounded-lg border border-card-ring p-3">
            <h3 className="font-semibold capitalize mb-2">{stage}</h3>
            <ul className="space-y-2">
              {items.map(i => (
                <li key={i.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{i.title}</div>
                    <div className="muted">{i.type} • {i.duration}</div>
                  </div>
                  <button
                    className="px-2 py-1 rounded bg-green-600 text-white text-xs"
                    onClick={() => onAdd(stage, i)}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
