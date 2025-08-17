import React, { useMemo } from "react";
import Card from "../../ui/Card.jsx";
import { getFeed } from "../../services/lessonStore";

export default function ParentFeed({ grade="Class 8", subject="English", chapterId }) {
  const posts = useMemo(() => getFeed({ grade, subject, chapterId }), [grade, subject, chapterId]);
  return (
    <Card title="Class Feed">
      {!posts.length ? (
        <div className="muted">No posts yet.</div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="card muted">
              <div className="title-sm">{p.post.title}</div>
              <div className="mt-1">{p.post.summary}</div>
              <div className="muted mt-1">{new Date(p.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

