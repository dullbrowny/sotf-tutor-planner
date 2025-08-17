
import React, { useState } from "react";
import { retrieve } from "../services/rag";
import { chatLLM } from "../services/llmClient";
import CitationLink from "../components/CitationLink";

const SYSTEM = {
  teacher: "You are a CBSE teacher coach. Be concise; suggest activities; cite textbook sections by exercise/example and include timeboxing.",
  student: "You are a helpful tutor. Explain step-by-step, ask checks for understanding, scaffold solutions, and cite relevant textbook pages/examples.",
  parent:  "You are a friendly parent guide. Explain progress plainly, suggest at-home support, and cite relevant textbook sections.",
  admin:   "You summarize trends across classes without PII. Be actionable and concise; cite sources."
};

export default function ChatPanel({ persona="teacher", grade=9, subject="Science", chapterId }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [ctx, setCtx] = useState([]);
  const [busy, setBusy] = useState(false);

  async function ask() {
    setBusy(true); setAnswer(""); setCtx([]);
    const hits = await retrieve({ query: q, chapterId, subject, grade, topK: 6 });
    setCtx(hits);

    const snippets = hits.map((h,i)=>`[${i+1}] ${h.chapterId} p.${h.page}: ${h.text.slice(0,300)}`).join("\n\n");
    const messages = [
      { role: "system", content: SYSTEM[persona] || SYSTEM.teacher },
      { role: "user", content: `Question: ${q}\n\nUse only this textbook context:\n${snippets}\n\nAnswer with references like [1], [2] where helpful.` }
    ];
    try {
      const out = await chatLLM({ messages });
      setAnswer(out);
    } catch (e) {
      setAnswer("LLM error: "+e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="text-lg font-semibold">Ask ({persona})</div>
      <div className="flex gap-2">
        <input className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" placeholder="Ask about today's topic…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn-primary" disabled={!q || busy} onClick={ask}>{busy ? "Thinking…" : "Ask"}</button>
      </div>
      {answer && (
        <div className="prose prose-invert text-sm whitespace-pre-wrap">{answer}</div>
      )}
      {ctx.length>0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-400">Sources</div>
          {ctx.map((c,i) => (
            <div key={c.id} className="text-xs">
              [{i+1}] <CitationLink refObj={{ chapterId: c.chapterId, page: c.page }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
