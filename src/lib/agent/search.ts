// Tìm kiếm web qua DuckDuckGo HTML (công khai, không cần key).
// Không scrape các trang bán hàng trực tiếp — chỉ dùng kết quả tìm kiếm công khai.

import { WebResult } from "./types";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function sourceTypeOf(url: string): string {
  const d = domainOf(url).toLowerCase();
  if (/(apple|samsung|mi\.com|xiaomi|sony|asus|lenovo|dell|jbl|bose|logitech|huawei|oppo|vivo|realme)\./.test(d))
    return "official";
  if (/(cellphones|fptshop|thegioididong|hoangha|gearvn|anphat|nguyenkim|dienmayxanh|phongvu|mediamart)/.test(d))
    return "retailer";
  if (/(reddit|facebook|voz|tinhte)/.test(d)) return "community";
  if (/(youtube)/.test(d)) return "video";
  return "review";
}

function decodeDdgHref(href: string): string | null {
  const uddg = href.match(/[?&]uddg=([^&]+)/);
  if (uddg) {
    try {
      href = decodeURIComponent(uddg[1]);
    } catch {
      return null;
    }
  }
  if (!/^https?:\/\//.test(href) || /duckduckgo\.com/.test(href)) return null;
  return href;
}

async function ddgSearch(query: string): Promise<WebResult[]> {
  const res = await fetch(
    "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query),
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) shop-research-agent/1.0",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error("ddg " + res.status);
  const html = await res.text();
  const out: WebResult[] = [];
  const re = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const sre = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  const snippets: string[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = sre.exec(html))) {
    snippets.push(sm[1].replace(/<[^>]+>/g, "").trim().slice(0, 400));
  }
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(html)) && out.length < 8) {
    const href = decodeDdgHref(m[1]);
    const title = m[2].replace(/<[^>]+>/g, "").trim().slice(0, 120);
    if (!href || !title) continue;
    out.push({ title, url: href, snippet: snippets[i] || "", source: domainOf(href) });
    i++;
  }
  return out;
}

// Backend dự phòng: DuckDuckGo Lite (ít bị chặn hơn từ datacenter)
async function ddgLiteSearch(query: string): Promise<WebResult[]> {
  const res = await fetch(
    "https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(query),
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) shop-research-agent/1.0",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error("ddg-lite " + res.status);
  const html = await res.text();
  const out: WebResult[] = [];
  const linkRe = /<a[^>]*href="([^"]+)"[^>]*class='result-link'[^>]*>([\s\S]*?)<\/a>/g;
  const snipRe = /<td class='result-snippet'[^>]*>([\s\S]*?)<\/td>/g;
  const snippets: string[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = snipRe.exec(html))) {
    snippets.push(sm[1].replace(/<[^>]+>/g, "").trim().slice(0, 400));
  }
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = linkRe.exec(html)) && out.length < 8) {
    const href = decodeDdgHref(m[1]);
    const title = m[2].replace(/<[^>]+>/g, "").trim().slice(0, 120);
    if (!href || !title) continue;
    out.push({ title, url: href, snippet: snippets[i] || "", source: domainOf(href) });
    i++;
  }
  if (!out.length) throw new Error("ddg-lite empty");
  return out;
}

// Backend chính khi có BRAVE_API_KEY (free tier 2.000 query/tháng, không cần billing):
// JSON sạch, chạy ổn định từ mọi IP kể cả datacenter.
async function braveSearch(query: string): Promise<WebResult[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) throw new Error("no brave key");
  const res = await fetch(
    "https://api.search.brave.com/res/v1/web/search?" +
      new URLSearchParams({ q: query, count: "10", country: "VN", search_lang: "vi" }),
    {
      headers: {
        "X-Subscription-Token": key,
        Accept: "application/json",
        "User-Agent": "shop-research-agent/1.0",
      },
      signal: AbortSignal.timeout(12000),
    }
  );
  if (!res.ok) throw new Error("brave " + res.status);
  const data = await res.json();
  const items = data?.web?.results || [];
  const out: WebResult[] = [];
  for (const it of items.slice(0, 8)) {
    const url = (it.url || "").toString();
    const title = (it.title || "").toString().trim().slice(0, 120);
    if (!/^https?:\/\//.test(url) || !title) continue;
    out.push({
      title,
      url,
      snippet: (it.description || "").toString().trim().slice(0, 400),
      source: domainOf(url),
    });
  }
  if (!out.length) throw new Error("brave empty");
  return out;
}

async function searchOne(query: string): Promise<WebResult[]> {
  const attempts: [string, (q: string) => Promise<WebResult[]>][] = [
    ["brave", braveSearch],
    ["ddg", ddgSearch],
    ["ddg-lite", ddgLiteSearch],
  ];
  const errors: string[] = [];
  for (const [name, fn] of attempts) {
    try {
      return await fn(query);
    } catch (e) {
      errors.push(`${name}:${(e as Error).message}`);
    }
  }
  console.error("search failed:", query.slice(0, 40), errors.join(" / "));
  return [];
}

// Tạo chiến lược tìm kiếm theo danh mục + ý định
export function buildQueries(
  categoryVi: string,
  categoryEn: string,
  budgetText: string | null,
  features: string[],
  useCase: string | null,
  templates: string[]
): string[] {
  const budget = budgetText || "";
  const feature = features.slice(0, 2).join(" ") || "";
  const use = useCase || "";
  const fill = (t: string) =>
    t
      .replace("{categoryvi}", categoryVi)
      .replace("{budget}", budget)
      .replace("{feature}", feature)
      .replace(/ {2,}/g, " ")
      .trim();
  const queries = templates.slice(0, 3).map(fill).filter((q) => q.length > 8);
  if (use) queries.push(`${categoryVi} tốt nhất cho ${use} ${budget}`.trim());
  queries.push(`mua ${categoryVi} ${budget} giá tốt chính hãng`.trim());
  // Truy vấn tiếng Anh để bắt tên model cụ thể từ review quốc tế
  if (categoryEn && categoryEn !== "products") {
    queries.push(`best budget ${categoryEn} 2026 review`);
    if (feature) queries.push(`best ${categoryEn} ${feature} 2026`.trim());
  }
  return [...new Set(queries)].slice(0, 6);
}

export async function multiSearch(queries: string[]): Promise<WebResult[]> {
  const all = await Promise.all(queries.map((q) => searchOne(q)));
  const seen = new Set<string>();
  const out: WebResult[] = [];
  for (const list of all) {
    for (const r of list) {
      const key = r.url.split("?")[0].toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}
