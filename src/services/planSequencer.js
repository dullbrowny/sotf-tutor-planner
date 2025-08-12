import { api } from "../api";
import { annotateWithChapter } from "./chapterRef";

// Heuristic 4-phase sequence that lands ~ target minutes (±2)
export async function generateSequence({ klass, subject, loIds, target = 20 }) {
  const los = (loIds && loIds.length)
    ? loIds
    : (api.cbse?.getLOs({ klass, subject }) || []).slice(0, 2).map(x => x.id);

  const pool = [];
  for (const lo of los) {
    const ex = api.cbse?.getExercisesByLO([lo], { limit: 12 }) || [];
    ex.forEach(e => pool.push({ ...e, lo }));
  }

  // Prefer cited + shorter first
  pool.sort((a, b) =>
    (Number(!!b.citation) - Number(!!a.citation)) ||
    ((a.estMinutes || 6) - (b.estMinutes || 6))
  );

  const phases = { warmup: [], teach: [], practice: [], reflect: [] };
  const cap = { warmup: 5, teach: 8, practice: Math.max(target - 6, 6), reflect: 3 };

  for (const x of pool) {
    const m = x.estMinutes || 6;
    if (mins(phases.warmup)   < cap.warmup   && m <= 6)     { phases.warmup.push(x);   continue; }
    if (mins(phases.teach)    < cap.teach    && x.citation) { phases.teach.push(x);    continue; }
    if (mins(phases.practice) < cap.practice)               { phases.practice.push(x); continue; }
  }
  const leftover = pool.find(x => !Object.values(phases).some(arr => arr.includes(x)));
  if (leftover) phases.reflect.push(leftover);

  const seq = trimToTarget([...phases.warmup, ...phases.teach, ...phases.practice, ...phases.reflect], target);

  const phaseOf = (n) =>
    phases.warmup.includes(n)   ? "warmup"  :
    phases.teach.includes(n)    ? "teach"   :
    phases.practice.includes(n) ? "practice" : "reflect";

  const seqWithPhase = seq.map(x => ({ ...x, phase: phaseOf(x) }));
  const withCh = annotateWithChapter(seqWithPhase, los)
    .map((x, i) => ({ ...x, id: x.id || `it${i + 1}` }));

  return { phases, items: withCh, loIds: los };
}

function mins(arr){ return arr.reduce((s,x)=>s+(x.estMinutes||6),0); }
function trimToTarget(items, target){
  let sum=0, out=[];
  for(const x of items){
    const m=x.estMinutes||6;
    if(sum+m>target+2) continue;
    out.push(x); sum+=m;
    if(sum>=target-2) break;
  }
  let i=0;
  while(sum<target-2 && i<items.length){
    const x=items[i++]; if(out.includes(x)) continue;
    out.push(x); sum+=(x.estMinutes||6);
  }
  return out;
}

// Optional server LLM; safe no-op unless enabled
export async function suggestSequenceLLM(ctx){
  if (import.meta.env.VITE_LLM_ENABLED !== '1') return null;
  try {
    const res = await fetch('/api/llm-sequence',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ctx)
    });
    if(!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

