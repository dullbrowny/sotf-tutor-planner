// src/components/PlanPreview.jsx
import React from "react";

export default function PlanPreview({
  sections = [],
  open = true,
  onClose = () => {},
  variant = "inline", // "inline" | "modal"
  title = "Microplan Preview",
}) {
  if (!open) return null;

  const body = (
    <div className="rounded-2xl bg-[var(--panel)] border border-[var(--panelBorder)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--panelBorder)]">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-md bg-[var(--btnSecondaryBg)] hover:opacity-90"
        >
          Close
        </button>
      </div>
      <div className="p-4 space-y-4">
        {sections.length === 0 ? (
          <div className="text-sm opacity-70">Nothing to show yet.</div>
        ) : (
          sections.map((s, i) => (
            <div key={i} className="space-y-2">
              <div className="text-sm uppercase tracking-wide opacity-70">
                {s.title}
              </div>
              <div className="rounded-xl bg-[var(--panelSoft)] px-4 py-3 text-[15px] leading-6">
                {s.body}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (variant === "modal") {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center"
        aria-modal="true"
        role="dialog"
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative z-[61] w-[min(920px,92vw)] max-h-[88vh] overflow-auto shadow-2xl">
          {body}
        </div>
      </div>
    );
  }

  // inline
  return <div className="w-full">{body}</div>;
}

