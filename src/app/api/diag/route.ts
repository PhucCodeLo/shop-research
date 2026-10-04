import { NextResponse } from "next/server";

export async function GET() {
  const out: Record<string, unknown> = {};
  const tests: [string, string][] = [
    ["ddg-html-direct", "https://html.duckduckgo.com/html/?q=test"],
    ["ddg-www-direct", "https://duckduckgo.com/html/?q=test"],
    ["bing-direct", "https://www.bing.com/search?q=test"],
    ["yandex-direct", "https://yandex.com/search/?text=test"],
  ];
  for (const [name, u] of tests) {
    const t0 = Date.now();
    try {
      const res = await fetch(u, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) shop-research-agent/1.0",
        },
        signal: AbortSignal.timeout(12000),
      });
      const text = await res.text();
      out[name] = { status: res.status, ms: Date.now() - t0, len: text.length, head: text.slice(0, 100).replace(/\s+/g, " ") };
    } catch (e) {
      out[name] = { error: (e as Error).message, ms: Date.now() - t0 };
    }
  }
  return NextResponse.json(out);
}
