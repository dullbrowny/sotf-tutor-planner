export default function FooterActions({ onSend }) {
  return (
    <div className="p-4 bg-white border rounded-xl flex justify-end gap-2">
      <button className="px-3 py-2 rounded border">Revise</button>
      <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={onSend}>Send to Student</button>
    </div>
  )
}
