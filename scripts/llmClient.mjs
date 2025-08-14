export async function llmJSON({
  messages,
  model = process.env.TOGETHER_MODEL || process.env.TOGETHER_MODEL_LIGHT || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  schemaName = "Output",
  schema = {},
  temperature = 0.2
}) {
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature,
      // Some Together models don’t fully honor strict schema; keep hint but be tolerant on parse:
      response_format: { type: "json_object", schema_name: schemaName, schema },
      messages: [
        { role: "system", content: "Return ONLY JSON. No prose. No markdown fences." },
        ...messages
      ]
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(()=>"?");
    throw new Error(`Together ${res.status}: ${t}`);
  }
  const data = await res.json();
  let txt = data?.choices?.[0]?.message?.content || "{}";

  // --- tolerant parsing ---
  // strip markdown fences if present
  const fence = txt.match(/```json\s*([\s\S]*?)```/i) || txt.match(/```([\s\S]*?)```/);
  if (fence) txt = fence[1];

  // grab the first balanced-looking JSON object if there’s leading/trailing junk
  const firstBrace = txt.indexOf("{");
  const lastBrace = txt.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) txt = txt.slice(firstBrace, lastBrace + 1);

  // remove trailing commas before } or ]
  txt = txt.replace(/,\s*([}\]])/g, "$1");

  // remove control chars that break JSON
  txt = txt.replace(/[\u0000-\u001F]/g, "");

  try {
    return JSON.parse(txt);
  } catch (e) {
    // final fallback: minimal shape so enrich script can continue
    return { chapter: {}, anchors: [], topics: [], loMatches: [] };
  }
}

