// Tìm kiếm web qua Bing RSS (https://www.bing.com/search?format=rss).
// - Không cần API key, không billing, không proxy.
// - Chạy trực tiếp từ Vercel (đã kiểm chứng: 200 trong ~170ms,
//   trong khi DuckDuckGo trả 403 với IP datacenter).
// - Dùng setlang=vi để Bing hiểu đúng tiếng Việt.
// Chỉ dùng kết quả tìm kiếm công khai, không scrape trang bán hàng.

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

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseBingRss(xml: string): WebResult[] {
  const out: WebResult[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) && out.length < 8) {
    const item = m[1];
    const title = /<title>([\s\S]*?)<\/title>/.exec(item);
    const link = /<link>([\s\S]*?)<\/link>/.exec(item);
    const desc = /<description>([\s\S]*?)<\/description>/.exec(item);
    const url = link ? unescapeXml(link[1]) : "";
    const titleText = title ? unescapeXml(title[1]).slice(0, 120) : "";
    if (!/^https?:\/\//.test(url) || !titleText) continue;
    if (/bing\.com/.test(url)) continue;
    out.push({
      title: titleText,
      url,
      snippet: desc ? unescapeXml(desc[1]).slice(0, 400) : "",
      source: domainOf(url),
    });
  }
  return out;
}

export async function bingRssSearch(query: string): Promise<WebResult[]> {
  const url =
    "https://www.bing.com/search?format=rss&setlang=vi&q=" +
    encodeURIComponent(query);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) shop-research-agent/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("bing " + res.status);
  const xml = await res.text();
  const results = parseBingRss(xml);
  if (!results.length) throw new Error("bing empty");
  return results;
}

async function searchOne(query: string): Promise<WebResult[]> {
  try {
    return await bingRssSearch(query);
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
  // "nên mua" đặt cuối câu để Bing không đọc nhầm "mua" thành chữ viết tắt MUA
  queries.push(`${categoryVi} ${budget} giá tốt chính hãng nên mua`.trim());
  // Truy vấn tiếng Anh để bắt tên model cụ thể từ review quốc tế
  if (categoryEn && categoryEn !== "products") {
    queries.push(`best budget ${categoryEn} 2026 review`);
    if (feature) queries.push(`best ${categoryEn} ${feature} 2026`.trim());
  }
  return [...new Set(queries)].slice(0, 5);
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
