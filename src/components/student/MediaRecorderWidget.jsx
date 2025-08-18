import React, { useEffect, useRef, useState } from "react";
import Button from "../../ui/Button.jsx";
import { putBlob } from "../../lib/blobs.js";

export default function MediaRecorderWidget({
  mode = "audio",
  onRecorded,
  filename,
  badge,
  showBadge = false,           // NEW: badge is opt-in (default hidden)
}) {
  const [stream, setStream] = useState(null);
  const [rec, setRec] = useState(null);
  const [isRec, setIsRec] = useState(false);
  const [dur, setDur] = useState(0);
  const [err, setErr] = useState("");
  const chunks = useRef([]);
  const ticker = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => () => stopAll(), []);

  function stopAll() {
    if (ticker.current) clearInterval(ticker.current);
    try { rec?.state === "recording" && rec.stop(); } catch {}
    stream?.getTracks()?.forEach(t => t.stop());
    setStream(null); setRec(null); setIsRec(false); setDur(0);
  }

  async function start() {
    try {
      setErr("");
      const constraints = mode === "audio"
        ? { audio: { echoCancellation:true, noiseSuppression:true } }
        : { audio: { echoCancellation:true, noiseSuppression:true },
            video: { width:{ideal:1280}, height:{ideal:720}, facingMode:"user" } };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);

      const options = mode === "audio"
        ? { mimeType: "audio/webm", audioBitsPerSecond: 192000 }
        : { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" : "video/webm",
            videoBitsPerSecond: 1500000, audioBitsPerSecond: 128000 };

      const r = new MediaRecorder(s, options);
      chunks.current = [];
      r.ondataavailable = e => { if (e.data && e.data.size) chunks.current.push(e.data); };
      r.onstop = async () => {
        if (!chunks.current.length) return;
        const blob = new Blob(chunks.current, { type: options.mimeType });
        const id = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
        const meta = await putBlob(id, blob, filename || (mode === "audio" ? "audio.webm" : "video.webm"));
        onRecorded?.(meta);
      };

      if (videoRef.current && mode === "video") {
        videoRef.current.srcObject = s;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch(()=>{});
      }

      r.start(250);
      setRec(r); setIsRec(true); setDur(0);
      ticker.current = setInterval(()=>setDur(d=>d+1), 1000);
    } catch (e) {
      setErr(e?.message || "Permission denied / unsupported.");
    }
  }

  function pause(){ try{rec?.pause();}catch{} }
  function resume(){ try{rec?.resume();}catch{} }
  function stop(){ stopAll(); }

  const mm = String(Math.floor(dur/60)).padStart(2,"0");
  const ss = String(dur%60).padStart(2,"0");

  return (
    <div className="flex items-start gap-12">
      <div className="flex items-center gap-8">
        {!isRec && (
          <Button variant="secondary" onClick={start}>
            {mode==="audio" ? "Start mic" : "Start camera"}
          </Button>
        )}
        {isRec && (
          <>
            <span className="text-xs px-2 py-1 rounded-full border border-red-500 text-red-400 flex items-center gap-2">
              <span style={{width:8,height:8,background:"#ef4444",borderRadius:999}}/>
              REC {mm}:{ss}
            </span>
            <Button variant="secondary" onClick={pause}>⏸</Button>
            <Button variant="secondary" onClick={resume}>▶</Button>
            <Button onClick={stop}>⏹ Attach</Button>
          </>
        )}
        {err && <span className="text-xs text-red-400">{err}</span>}
      </div>

      {mode==="video" && (
        <div style={{position:"relative"}}>
          <video
            ref={videoRef}
            style={{width:200, height:120, background:"#000", borderRadius:10, border:"1px solid #334155"}}
          />
          {showBadge && !!badge && (
            <div style={{
              position:"absolute", left:8, bottom:8,
              fontSize:10, padding:"2px 6px",
              background:"rgba(0,0,0,.55)", color:"#e5e7eb",
              borderRadius:999, border:"1px solid #374151"
            }}>{badge}</div>
          )}
        </div>
      )}
    </div>
  );
}

