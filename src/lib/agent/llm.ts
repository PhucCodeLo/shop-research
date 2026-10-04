// LLM client qua Pollinations (miễn phí, không cần key).
// Mọi lời gọi đều có timeout + retry + fallback, không bao giờ làm sập request.

const LLM_TIMEOUT_MS = 20000;
const LLM_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchLlm(prompt: string): Promise<string | null> {
  const url = "https://text.pollinations.ai/" + encodeURIComponent(prompt);
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= LLM_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "shop-research-agent/1.0" },
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      });
      if (!res.ok) {
        lastErr = new Error("http " + res.status);
        // 429/5xx → đợi rồi thử lại; 4xx khác → bỏ luôn
        if (res.status === 429 || res.status >= 500) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        return null;
      }
      const text = (await res.text()).trim();
      if (text) return text;
      lastErr = new Error("empty");
    } catch (e) {
      lastErr = e;
    }
    await sleep(1200 * (attempt + 1));
  }
  console.error("llm failed after retries:", (lastErr as Error)?.message);
  return null;
}

export async function llmJson<T>(prompt: string, fallback: T): Promise<T> {
  const text0 = await fetchLlm(prompt);
  if (!text0) return fallback;
  try {
    let text = text0;
    // Bóc JSON nếu model bọc trong markdown code fence
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1].trim();
    const trimmed = text.trim();
    if (trimmed.startsWith("[")) {
      const end = trimmed.lastIndexOf("]");
      if (end > 0) text = trimmed.slice(0, end + 1);
      else return fallback;
    } else {
      const start = trimmed.indexOf("{");
      const end = trimmed.lastIndexOf("}");
      if (start >= 0 && end > start) text = trimmed.slice(start, end + 1);
      else return fallback;
    }
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function llmText(prompt: string, fallback: string): Promise<string> {
  const text = await fetchLlm(prompt);
  return text || fallback;
}
