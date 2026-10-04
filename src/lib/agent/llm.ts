// LLM client qua Pollinations (miễn phí, không cần key).
// Mọi lời gọi đều có timeout + fallback, không bao giờ làm sập request.

const LLM_TIMEOUT_MS = 25000;

export async function llmJson<T>(prompt: string, fallback: T): Promise<T> {
  try {
    const url =
      "https://text.pollinations.ai/" + encodeURIComponent(prompt);
    const res = await fetch(url, {
      headers: { "User-Agent": "shop-research-agent/1.0" },
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!res.ok) return fallback;
    let text = (await res.text()).trim();
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
  try {
    const url =
      "https://text.pollinations.ai/" + encodeURIComponent(prompt);
    const res = await fetch(url, {
      headers: { "User-Agent": "shop-research-agent/1.0" },
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!res.ok) return fallback;
    return (await res.text()).trim() || fallback;
  } catch {
    return fallback;
  }
}
