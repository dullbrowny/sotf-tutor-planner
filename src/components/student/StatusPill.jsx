import React from "react";

export default function StatusPill({ status = "todo", onClick }) {
  const cfg = {
    todo:        { bg:"#111827", bd:"#374151", fg:"#9CA3AF", label:"Todo" },
    in_progress: { bg:"#312e18", bd:"#a1620733", fg:"#fbbf24", label:"In progress" },
    done:        { bg:"#07261c", bd:"#05966933", fg:"#34d399", label:"Done" },
  }[status] || { bg:"#111827", bd:"#374151", fg:"#9CA3AF", label:status };
  return (
    <button
      onClick={onClick}
      title={cfg.label}
      className="inline-flex items-center rounded-full"
      style={{
        padding:"1px 6px",
        fontSize:10,
        lineHeight:"12px",
        border:`1px solid ${cfg.bd}`,
        background:cfg.bg, color:cfg.fg
      }}
    >
      {cfg.label}
    </button>
  );
}

