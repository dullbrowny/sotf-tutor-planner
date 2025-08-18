import React from "react";
import Button from "../../ui/Button.jsx";
import MediaRecorderWidget from "../student/MediaRecorderWidget.jsx";

export default function UnifiedComposer({
  text, onText,
  attachments, onAddAttachments, onRemoveAttachment,
  disabled = false,
  submitting = false,             // NEW: show "Submitting…" state
  onAsk, onSubmitRequest,
  recorderBadge,                  // NEW: Subject · Section label on video preview
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [mode, setMode] = React.useState("text"); // text|audio|video
  const fileRef = React.useRef(null);

  function pickFiles(){ fileRef.current?.click(); }
  function onFiles(e){
    const files = Array.from(e.target.files || []);
    if (files.length) onAddAttachments?.(files);
    e.target.value = "";
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 p-2 rounded-2xl border border-slate-700 bg-slate-900">
        {/* + menu */}
        <div className="relative">
          <Button variant="ghost" onClick={() => setMenuOpen(v=>!v)} title="Attach">+</Button>
          {menuOpen && (
            <div className="absolute left-0 mt-2 z-50 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow">
              <button className="block w-full text-left px-3 py-2 hover:bg-slate-800" onClick={()=>{setMenuOpen(false); pickFiles();}}>
                📎 Upload file
              </button>
              <button className="block w-full text-left px-3 py-2 hover:bg-slate-800" onClick={()=>{setMode("audio"); setMenuOpen(false);}}>
                🎙️ Record audio
              </button>
              <button className="block w-full text-left px-3 py-2 hover:bg-slate-800" onClick={()=>{setMode("video"); setMenuOpen(false);}}>
                🎥 Record video
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" multiple accept="image/*,audio/*,video/*,application/pdf" className="hidden" onChange={onFiles}/>
        </div>

        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Ask anything or write your answer…"
          value={text}
          onChange={(e)=>onText?.(e.target.value)}
          disabled={disabled}
        />

        <div className="flex items-center gap-1">
          <Button variant={mode==="text" ? "secondary" : "ghost"} onClick={()=>setMode("text")} title="Type">Text</Button>
          <Button variant={mode==="audio" ? "secondary" : "ghost"} onClick={()=>setMode("audio")} title="Record audio">Mic</Button>
          <Button variant={mode==="video" ? "secondary" : "ghost"} onClick={()=>setMode("video")} title="Record video">Cam</Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={()=>onAsk?.()} disabled={disabled}>Ask</Button>
          <Button onClick={()=>onSubmitRequest?.()} disabled={disabled || submitting}>
            {submitting ? "Submitting…" : "Submit…"}
          </Button>
        </div>
      </div>

      {mode!=="text" && (
        <div className="mt-2">
          <MediaRecorderWidget
            mode={mode}
            onRecorded={(meta)=>{
              // meta is {id,name,type,size}; pass straight through
              onAddAttachments?.([{ __blobMeta:true, ...meta }]);
              setMode("text");
            }}
          />
        </div>
      )}

      {!!attachments?.length && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((a,i)=>(
            <span key={(a.id||a._id)||i} className="px-2 py-1 text-xs rounded border border-slate-700">
              {a.name || `file-${i+1}`}{" "}
              <button className="ml-1 opacity-70 hover:opacity-100" onClick={()=>onRemoveAttachment?.(a)} title="Remove">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

