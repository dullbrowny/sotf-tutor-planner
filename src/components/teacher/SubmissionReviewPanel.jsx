// src/components/teacher/SubmissionReviewPanel.jsx
import React from "react";
import Button from "../../ui/Button.jsx";
import {
  listSubmissionsForPlan,
  addTeacherFeedback,
  listMessages,
  postMessage,
} from "../../state/submissions.js";
import { getBlobURL } from "../../lib/blobs.js";

const STATUS_ORDER = { submitted: 0, returned: 1, draft: 2, accepted: 3 };
const LABEL = {
  submitted: "Submitted",
  returned: "Returned",
  accepted: "Accepted",
  draft: "Draft",
};

export default function SubmissionReviewPanel({
  teacherId = "T-001",
  planId,
  sectionId,
  onClose,
}) {
  const [subs, setSubs] = React.useState([]);
  const [sel, setSel] = React.useState(null);
  const [fb, setFb] = React.useState("");
  const [msgs, setMsgs] = React.useState([]);
  const [reply, setReply] = React.useState("");
  const [filter, setFilter] = React.useState("submitted"); // submitted|returned|all
  const [q, setQ] = React.useState("");

  // Load and keep selection valid (prefer first submitted)
  const reload = React.useCallback(() => {
    const all = (listSubmissionsForPlan(planId) || [])
      .filter((s) => !sectionId || s.sectionId === sectionId)
      .sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          b.updatedAt - a.updatedAt
      );

    setSubs(all);
    if (!sel || !all.find((s) => s.id === sel.id)) {
      setSel(all.find((s) => s.status === "submitted") || all[0] || null);
    }
  }, [planId, sectionId]); // eslint-disable-line

  // Quiet auto-refresh (prevents stale list; replaces "Sync")
  React.useEffect(() => {
    reload();
    const t = setInterval(reload, 1500);
    return () => clearInterval(t);
  }, [reload]);

  // Load clarifications thread for selected item
  React.useEffect(() => {
    if (!sel) {
      setMsgs([]);
      return;
    }
    setMsgs(listMessages(planId, sel.sectionId));
  }, [sel, planId]);

  // Status counters for filter chips
  const counts = React.useMemo(() => {
    const c = { submitted: 0, returned: 0 };
    for (const s of subs) {
      if (s.status === "submitted") c.submitted += 1;
      else if (s.status === "returned") c.returned += 1;
    }
    return c;
  }, [subs]);

  const filtered = subs.filter((s) => {
    const okStatus = filter === "all" ? true : s.status === filter;
    const qq = q.trim().toLowerCase();
    const okQuery =
      !qq ||
      s.studentId.toLowerCase().includes(qq) ||
      (s.sectionId || "").toLowerCase().includes(qq);
    return okStatus && okQuery;
  });

  function advance() {
    const list = filtered.length ? filtered : subs;
    const i = list.findIndex((s) => s.id === sel?.id);
    const next =
      list.slice(i + 1).find((s) => s.status === "submitted") ||
      list[i + 1] ||
      null;
    setSel(next);
  }

  function accept() {
    if (!sel) return;
    addTeacherFeedback({
      teacherId,
      studentId: sel.studentId,
      planId,
      sectionId: sel.sectionId,
      feedback: fb,
      status: "accepted",
    });
    setFb("");
    advance();
  }

  function sendBack() {
    if (!sel) return;
    addTeacherFeedback({
      teacherId,
      studentId: sel.studentId,
      planId,
      sectionId: sel.sectionId,
      feedback: fb,
      status: "returned",
    });
    setFb("");
    advance();
  }

  function sendReply() {
    if (!sel || !reply.trim()) return;
    postMessage({
      role: "teacher",
      text: reply.trim(),
      teacherId,
      planId,
      sectionId: sel.sectionId,
    });
    setReply("");
    setMsgs(listMessages(planId, sel.sectionId));
  }

  return (
    <div className="card p-4" style={{ maxHeight: "80vh", overflow: "auto" }}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Submissions</div>
        {onClose && (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Explicit 2-col grid fixes name/label overlap */}
      <div
        className="mt-3 grid gap-3"
        style={{ gridTemplateColumns: "minmax(260px, 320px) 1fr" }}
      >
        {/* Left rail: inbox list */}
        <div style={{ overflow: "auto" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs opacity-70">Filter:</span>
            <Button
              size="sm"
              variant={filter === "submitted" ? "secondary" : "ghost"}
              onClick={() => setFilter("submitted")}
              title="Show only new submissions"
            >
              Submitted {counts.submitted ? `(${counts.submitted})` : ""}
            </Button>
            <Button
              size="sm"
              variant={filter === "returned" ? "secondary" : "ghost"}
              onClick={() => setFilter("returned")}
              title="Show items you sent back"
            >
              Returned {counts.returned ? `(${counts.returned})` : ""}
            </Button>
            <Button
              size="sm"
              variant={filter === "all" ? "secondary" : "ghost"}
              onClick={() => setFilter("all")}
              title="Show everything"
            >
              All
            </Button>
          </div>

          <input
            className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs mb-2"
            placeholder="Search student or section…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <ul className="space-y-2">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  className={`w-full text-left p-2 rounded border ${
                    sel?.id === s.id ? "border-blue-500" : "border-slate-700"
                  }`}
                  onClick={() => setSel(s)}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="text-sm font-medium"
                      style={{ wordBreak: "break-word" }}
                    >
                      {s.studentId}
                    </div>
                    <span className="text-xs opacity-70">
                      {LABEL[s.status]}
                    </span>
                  </div>
                  <div className="text-xs opacity-60">
                    {(s.sectionId || "section")} ·{" "}
                    {new Date(s.updatedAt).toLocaleString()}
                  </div>
                </button>
              </li>
            ))}
            {!filtered.length && (
              <li className="text-xs opacity-70">No submissions.</li>
            )}
          </ul>
        </div>

        {/* Right: review pane */}
        <div className="space-y-3 min-h-[200px]">
          {!sel && (
            <div className="text-sm opacity-70">Select a student to review.</div>
          )}

          {sel && (
            <>
              <div className="flex items-center justify-between">
                <div
                  className="text-sm font-semibold"
                  style={{ wordBreak: "break-word" }}
                >
                  {sel.studentId} ·{" "}
                  <span className="opacity-70">{LABEL[sel.status]}</span>
                </div>
                <Button variant="secondary" onClick={() => setSel(null)}>
                  Close submission
                </Button>
              </div>

              <div className="p-2 rounded border border-slate-700">
                <div className="text-xs opacity-70 mb-1">Text answer</div>
                <div className="text-sm whitespace-pre-wrap">
                  {sel.text || <em className="opacity-70">No text</em>}
                </div>
              </div>

              <div>
                <div className="text-xs opacity-70 mb-1">Attachments</div>
                <div className="space-y-2">
                  {sel.attachments?.length ? (
                    sel.attachments.map((a) => (
                      <AttachmentPreview key={a.id} att={a} />
                    ))
                  ) : (
                    <div className="text-xs opacity-70">None</div>
                  )}
                </div>
              </div>

              <div className="p-2 rounded border border-slate-700">
                <div className="text-xs opacity-70 mb-1">
                  Clarifications thread
                </div>
                <div className="space-y-1 text-sm max-h-40 overflow-auto">
                  {msgs.map((m) => (
                    <div key={m.id}>
                      <span className="opacity-60">
                        {new Date(m.ts).toLocaleTimeString()} · {m.role}
                      </span>
                      {": "}
                      {m.text}
                    </div>
                  ))}
                  {!msgs.length && (
                    <div className="opacity-60 text-xs">No messages yet.</div>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded border border-slate-700 bg-slate-900 p-2 text-sm"
                    placeholder="Reply to student…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <Button variant="secondary" onClick={sendReply}>
                    Send
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  className="flex-1 rounded border border-slate-700 bg-slate-900 p-2 text-sm"
                  placeholder="Feedback to student…"
                  value={fb}
                  onChange={(e) => setFb(e.target.value)}
                />
                <Button onClick={accept}>Accept</Button>
                <Button variant="secondary" onClick={sendBack}>
                  Return
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ att }) {
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    let live = true;
    (async () => {
      const u = await getBlobURL(att.id);
      if (live) setUrl(u);
    })();
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [att.id]);
  if (!url) return <div className="text-xs opacity-70">{att.name}</div>;
  const kind = (att.type || "").split("/")[0];
  if (kind === "audio")
    return <audio controls src={url} style={{ width: "100%" }} />;
  if (kind === "video")
    return (
      <video controls src={url} style={{ width: "100%", maxHeight: 360 }} />
    );
  if (kind === "image")
    return (
      <img src={url} alt={att.name} style={{ maxWidth: "100%", borderRadius: 8 }} />
    );
  return (
    <a className="underline" href={url} target="_blank" rel="noreferrer">
      {att.name}
    </a>
  );
}

