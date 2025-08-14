
// Browser Together.ai client (PoC). Note: exposes API key; ok for demo, not for prod.
export async function chatLLM({ messages, model = import.meta.env.VITE_TOGETHER_CHAT_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", temperature = 0.2 }) {
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature,
      messages
    })
  });
  if (!res.ok) throw new Error(`Together ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}
