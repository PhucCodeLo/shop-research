import { NextResponse } from "next/server";

export async function GET() {
  const out: Record<string, unknown> = {};
  const target = "https://html.duckduckgo.com/html/?q=test";
  const proxies = [
    "https://api.cors.lol/?url=" + encodeURIComponent(target),
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(target),
  ];
  for (const u of proxies) {
    const t0 = Date.now();
    try {
      const res = await fetch(u, {
        headers: { "User-Agent": "shop-research-agent/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      const text = await res.text();
      out[u.slice(8, 30)] = {
        status: res.status,
        ms: Date.now() - t0,
        len: text.length,
        head: text.slice(0, 120),
      };
    } catch (e) {
      out[u.slice(8, 30)] = { error: (e as Error).message, ms: Date.now() - t0 };
    }
  }
  // Test pollinations (LLM) luôn
  try {
    const t0 = Date.now();
    const r = await fetch("https://text.pollinations.ai/" + encodeURIComponent("hi"), {
      signal: AbortSignal.timeout(15000),
    });
    out["pollinations"] = { status: r.status, ms: Date.now() - t0 };
  } catch (e) {
    out["pollinations"] = { error: (e as Error).message };
  }
  return NextResponse.json(out);
}
