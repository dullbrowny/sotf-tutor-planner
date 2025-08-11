export default function StudentProfile() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>👤 <b>Name:</b> Arya Kapoor</div>
        <div>🎓 <b>Grade:</b> 7B</div>
        <div>🧠 <b>Learning Style:</b> Visual</div>
        <div>📊 <b>Mastery:</b> Low (Fractions)</div>
      </div>
      <div className="text-sm muted">
        <b className="text-text">Gaps:</b> abstract fraction comparison, equivalent fractions, verbal recall
      </div>
    </div>
  )
}
