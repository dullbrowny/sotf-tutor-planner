import React, { useMemo } from "react";
import Card from "../../ui/Card.jsx";
import Button from "../../ui/Button.jsx";
import { getLatest } from "../../services/lessonStore";

export default function StudentToday({ grade = "Class 8", subject = "English", chapterId }) {
  // Try exact match first, then latest across any class/subject.
  const plan = useMemo(() => {
    return getLatest({ grade, subject, chapterId }) || getLatest();
  }, [grade, subject, chapterId]);

  // 1) Preferred: student handout
  if (plan?.handout) {
    const h = plan.handout;
    return (
      <Card title={`Today · ${h.title}`}>
        <div className="muted">{h.intro}</div>
        {h.materials?.length ? (
          <div className="mt-2"><b>Materials:</b> {h.materials.join(", ")}</div>
        ) : null}

        <div className="mt-4 space-y-3">
          {(h.sections || []).map((s, idx) => (
            <div key={idx} className="card muted">
              <div className="title-sm">{s.title}</div>
              <div className="mt-1">{s.instructions}</div>
              <div className="mt-1"><i>Outcome:</i> {s.expectedOutcome}</div>
            </div>
          ))}
        </div>

        {h.exitTicket && (
          <div className="mt-4">
            <div className="title-sm">Exit Ticket</div>
            <div className="muted">{h.exitTicket.prompt}</div>
            <Button variant="secondary" className="mt-2" onClick={() => alert("Stub: submit response.")}>
              Start Exit Ticket
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // 2) Fallback: student-facing microplan (if handout not crafted yet)
  if (Array.isArray(plan?.microplan) && plan.microplan.length) {
    const blocks = plan.microplan.filter(b => (b.selected !== false) && (b.studentFacing !== false));
    return (
      <Card title={`Today · ${plan.chapterLabel || "Lesson"}`}>
        <div className="muted">
          Handout not crafted yet — showing student-facing plan steps.
        </div>
        <div className="mt-4 space-y-3">
          {blocks.map((b, idx) => (
            <div key={b.id || idx} className="card muted">
              <div className="title-sm">{b.title}</div>
              <div className="mt-1">{b.body}</div>
            </div>
          ))}
          {!blocks.length && <div className="muted">No student-facing steps yet.</div>}
        </div>
      </Card>
    );
  }

  // 3) Nothing saved yet
  return (
    <Card title="Today">
      <div className="muted">No plan yet. Ask your teacher to craft a handout.</div>
    </Card>
  );
}

