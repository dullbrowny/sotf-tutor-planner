export default function StudentProfile() {
  return (
    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 mb-4">
      <h2 className="font-semibold text-lg mb-2">Student Snapshot</h2>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>👤 <b>Name:</b> Arya Kapoor</div>
        <div>🎓 <b>Grade:</b> 7B</div>
        <div>🧠 <b>Learning Style:</b> Visual</div>
        <div>📊 <b>Mastery:</b> Low (Fractions)</div>
      </div>
      <div className="mt-3 text-sm">
        <b>Gaps:</b> abstract fraction comparison, equivalent fractions, verbal recall
      </div>
    </div>
  )
}
