import React, { useEffect, useState } from "react";
import { putBlob } from "../../lib/blobs.js";
import { saveDraft, submitWork, postMessage, getSubmission } from "../../state/submissions.js";
import ReviewDialog from "../common/ReviewDialog.jsx";
import UnifiedComposer from "../common/UnifiedComposer.jsx";

function StatusPillTiny({ status, feedback }) {
  if (!status || status === "draft") return null;
  const cfg = {
    submitted: { bg:"#fde68a22", bd:"#f59e0b", fg:"#b45309", label:"Pending review" },
    returned:  { bg:"#fecaca22", bd:"#ef4444", fg:"#991b1b", label:"Returned" },
    accepted:  { bg:"#bbf7d022", bd:"#10b981", fg:"#065f46", label:"Accepted ✓" },
  }[status];
  if (!cfg) return null;
  return (
    <span
      className="inline-flex items-center rounded-full ml-2"
      style={{ padding:"1px 6px", fontSize:10, lineHeight:"12px",
               border:`1px solid ${cfg.bd}`, background:cfg.bg, color:cfg.fg }}
      title={cfg.label + (status==="returned" && feedback ? ` · ${feedback}` : "")}
    >
      {cfg.label}
    </span>
  );
}

export default function SubmissionBox({ studentId, plan, section, onSubmitted }) {
  const [model, setModel] = useState(() => getSubmission(studentId, plan.id, section.id));
  const [text, setText] = useState(model?.text || "");
  const [files, setFiles] = useState(model?.attachments || []);
  const [showReview, setShowReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const readOnly = model?.status === "submitted" || model?.status === "accepted";

  useEffect(() => {
    const t = setInterval(() => {
      const s = getSubmission(studentId, plan.id, section.id);
      if (JSON.stringify(s) !== JSON.stringify(model)) {
        setModel(s); setText(s?.text || ""); setFiles(s?.attachments || []);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [studentId, plan.id, section.id, model]);

  async function addBlobs(fileList) {
    setBusy(true);
    try {
      const metas = [];
      for (const f of fileList) {
        if ((f && f.__blobMeta) || (f && f.id && typeof f.arrayBuffer !== "function")) {
          metas.push({ id: f.id, name: f.name, type: f.type, size: f.size }); continue;
        }
        const id = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
        const meta = await putBlob(id, f, f.name || "attachment");
        metas.push(meta);
      }
      const next = [...files, ...metas];
      setFiles(next);
      saveDraft({ studentId, planId: plan.id, sectionId: section.id, text, attachments: next });
      setModel(getSubmission(studentId, plan.id, section.id));
    } finally { setBusy(false); }
  }

  function removeAttachment(a) {
    const next = files.filter(x => (x.id||x._id) !== (a.id||a._id));
    setFiles(next);
    saveDraft({ studentId, planId: plan.id, sectionId: section.id, text, attachments: next });
    setModel(getSubmission(studentId, plan.id, section.id));
  }

  function ask() {
    if (!text.trim()) return;
    postMessage({ role: "student", text: text.trim(), studentId, planId: plan.id, sectionId: section.id });
    setText("");
  }

  function submitReq() {
    if (readOnly) return;
    setShowReview(true);
  }

  async function confirmSubmit() {
    setBusy(true);
    try {
      saveDraft({ studentId, planId: plan.id, sectionId: section.id, text, attachments: files });
      submitWork({ studentId, planId: plan.id, sectionId: section.id });
      setShowReview(false);
      setModel(getSubmission(studentId, plan.id, section.id));
      // collapse this section after submit
      onSubmitted?.();
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-3 p-3 border border-slate-700 rounded-2xl">
      <div className="flex items-center">
        <div className="text-sm font-medium">Submit your work</div>
        <StatusPillTiny status={model?.status} feedback={model?.teacherFeedback}/>
      </div>

      <UnifiedComposer
        text={text} onText={setText}
        attachments={files}
        onAddAttachments={addBlobs}
        onRemoveAttachment={removeAttachment}
        disabled={busy || readOnly}
        submitting={busy}
        onAsk={ask}
        onSubmitRequest={submitReq}
        recorderBadge={`${plan.subjectId} · ${section.title}`}
      />

      <ReviewDialog
        open={showReview}
        onClose={() => setShowReview(false)}
        onConfirm={confirmSubmit}
        text={text}
        attachments={files}
      />
    </div>
  );
}

