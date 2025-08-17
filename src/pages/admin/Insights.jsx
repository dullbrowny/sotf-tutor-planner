import React, { useMemo } from "react";
import Card from "../../ui/Card.jsx";
import { getAllPlans } from "../../services/lessonStore";

function yesNo(v){ return v ? "Yes" : "No"; }

export default function AdminInsights() {
  const rows = useMemo(() => getAllPlans(), []);
  if (!rows.length) return <Card title="Lesson Insights"><div className="muted">No recent plans.</div></Card>;

  return (
    <Card title="Lesson Insights">
      <div className="muted mb-2">Recent plans with mode, alignment and student-facing coverage.</div>
      <div className="card">
        <div className="card-body">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Class</th><th>Subject</th><th>Chapter</th><th>Mode</th>
                <th>LOs</th><th>Blocks</th><th>Student-facing</th><th>Citations</th><th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => {
                const blocks = Array.isArray(p.microplan) ? p.microplan : [];
                const studentFacing = blocks.filter(b => b.selected !== false && b.studentFacing !== false).length;
                const hasCites = blocks.some(b => Array.isArray(b.citations) && b.citations.length);
                return (
                  <tr key={`${p.grade}-${p.subject}-${p.chapterId}-${p.updatedAt}`}>
                    <td>{p.grade}</td>
                    <td>{p.subject}</td>
                    <td>{p.chapterLabel}</td>
                    <td>{p.mode}</td>
                    <td>{p.los?.length || 0}</td>
                    <td>{blocks.length}</td>
                    <td>{studentFacing}</td>
                    <td>{yesNo(hasCites)}</td>
                    <td>{new Date(p.updatedAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

