import React, { useState } from "react";
import Button from "../../ui/Button.jsx";
import { resetTodayAndEvents, resetAllSof, dumpSof } from "../../utils/resetDemo.js";

export default function DemoResetPanel({ compact=false }) {
  const [last, setLast] = useState(null);

  function doResetToday() {
    const n = resetTodayAndEvents();
    setLast(`Cleared Today + Events (${n} keys)`);
    alert("Cleared Today's attempts & event log.");
  }
  function doResetAll() {
    const n = resetAllSof();
    setLast(`Cleared all sof.* (${n} keys)`);
    alert("Cleared all sof.* demo state.");
  }
  function doExport() {
    const blob = new Blob([JSON.stringify(dumpSof(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sof-state.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={compact ? "flex gap-2" : "flex items-center gap-2"}>
      <Button variant="warning" onClick={doResetToday} title="Clear sof.today.v1 + sof.events.v1">Reset Today</Button>
      <Button variant="danger" onClick={doResetAll} title="Clear ALL sof.* keys">Reset ALL</Button>
      <Button variant="outline" onClick={doExport} title="Download current sof.* as JSON">Export state</Button>
      {last ? <span className="muted text-xs">{last}</span> : null}
    </div>
  );
}

