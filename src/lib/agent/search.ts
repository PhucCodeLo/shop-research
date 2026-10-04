// Tìm kiếm web qua Brave Search API.
// Yêu cầu BRAVE_API_KEY (free tier 2.000 query/tháng, không cần billing).
// Đăng ký tại https://brave.com/search/api/

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

export function isSearchConfigured(): boolean {
  return !!process.env.BRAVE_API_KEY;
}

async function braveSearch(query: string): Promise<WebResult[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) throw new Error("missing_key");
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
  return out;
}

async function searchOne(query: string): Promise<WebResult[]> {
  try {
    return await braveSearch(query);
  } catch (e) {
    console.error("search failed:", query.slice(0, 40), (e as Error).message);
    return [];
  }
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
