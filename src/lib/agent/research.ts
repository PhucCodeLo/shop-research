// Lõi nghiên cứu: trích xuất ứng viên, gom bằng chứng, chấm điểm, ưu/nhược điểm.

import { Intent, Product, WebResult } from "./types";
import { llmJson } from "./llm";
import { norm, CATEGORIES } from "./categories";
import { sourceTypeOf } from "./search";

// ---- Giá: "8.990.000₫" / "8,990,000đ" / "25 triệu" / "700k" → VND ----
export function parsePriceVnd(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, ".");
  let m = t.match(/([\d.]+)\s*(ty|tỷ)/);
  if (m) return Math.round(parseFloat(m[1]) * 1e9);
  m = t.match(/([\d.]+)\s*(trieu|tr\b)/);
  if (m) return Math.round(parseFloat(m[1]) * 1e6);
  m = t.match(/([\d.]+)\s*(k\b|nghin|ngan)/);
  if (m) {
    const v = parseFloat(m[1]);
    if (v >= 50 && v <= 500000) return Math.round(v * 1e3);
  }
  m = t.match(/([\d.]{4,})\s*(₫|d\b|dong|vnd)/);
  if (m) {
    const v = parseFloat(m[1].replace(/\./g, ""));
    if (v >= 10000 && v <= 1e9) return Math.round(v);
  }
  return null;
}

export function formatVnd(v: number | null): string | null {
  if (v == null) return null;
  return v.toLocaleString("vi-VN") + "₫";
}

// Trích xuất ứng viên: heuristic quét "Hãng + Model" trong title/snippet (xác định),
// rồi LLM chuẩn hoá/gộp trùng. Không bịa tên.
export async function extractCandidates(
  results: WebResult[],
  intent: Intent,
  brands: string[],
  deepNormalize = true // pha 2 có thể bỏ qua để tiết kiệm thời gian
): Promise<{ name: string; brand: string; priceText: string | null; specs: Record<string, string>; urls: WebResult[] }[]> {
  const allBrands = [...new Set([...brands, ...CATEGORIES.flatMap((c) => c.brands), "Anker", "Redmi", "Baseus", "Edifier", "Marshall"])];
  interface Mention { name: string; brand: string; count: number; urls: WebResult[]; priceText: string | null }
  const mentions = new Map<string, Mention>();

  const STOPWORDS = new Set(["thus", "with", "from", "that", "this", "these", "those", "are", "was", "were", "has", "have", "will", "would", "review", "reviews", "price", "best", "new", "top", "vs", "and", "the", "for", "pure", "vi", "vn", "viet", "nam", "vietnam",
    // Từ tiếng Việt thường gặp trong tiêu đề (không phải model)
    "tai", "nghe", "bluetooth", "khong", "day", "chong", "on", "gia", "tot", "nhat", "moi", "chinh", "hang", "ban", "mua", "danh", "cho", "cua", "cao", "cap", "tws", "day"]);

  for (const r of results) {
    const text = `${r.title} — ${r.snippet}`;
    for (const b of allBrands) {
      // "Hãng + Model": model gồm 1-4 token bắt đầu bằng chữ hoa hoặc số
      const re = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+((?:[A-Z0-9][\\w\\-+.]*)(?:\\s+[A-Z0-9][\\w\\-+.]*)*)`, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        let model = m[1].trim().replace(/\s+(review|đánh giá|giá|chính hãng|tốt nhất).*$/i, "").trim();
        // Cắt khi brand lặp lại trong model ("WF-1000XM6 Sony ..." → "WF-1000XM6")
        const bIdx = model.toLowerCase().indexOf(b.toLowerCase());
        if (bIdx > 0) model = model.slice(0, bIdx).trim();
        // Bỏ mảnh câu dính đuôi ("Tune Flex 2. So" → "Tune Flex 2")
        model = model.replace(/\.\s+[A-Z][a-z]*$/, "").trim();
        // Bỏ token cuối nếu là stopword; bỏ hẳn nếu toàn stopword
        let toks = model.split(/\s+/).filter(Boolean);
        while (toks.length && STOPWORDS.has(toks[toks.length - 1].toLowerCase().replace(/[^a-z]/g, ""))) {
          toks.pop();
        }
        // Bỏ token cuối quá ngắn (<3 ký tự, không có số) — thường là mảnh vụn ("Ch", "X")
        // nhưng giữ lại token có số ("NC" trong "R60i NC" được giữ nhờ token trước có số... chỉ giữ nếu model còn ≥2 token)
        while (toks.length > 1 && toks[toks.length - 1].length < 3 && !/[0-9]/.test(toks[toks.length - 1])) {
          // Ngoại lệ: giữ "NC"/"Pro" nếu token trước đó có số (vd "R60i NC")
          const prev = toks[toks.length - 2] || "";
          if (/[0-9]/.test(prev) && /^(nc|pro|max|plus|lite)$/i.test(toks[toks.length - 1])) break;
          toks.pop();
        }
        if (!toks.length) continue;
        model = toks.join(" ");
        // Cắt tại ranh giới câu ("G15. RTX 4060" → "G15")
        model = model.split(/\.\s+/)[0].trim();
        // Bỏ model chỉ 1 token mà không có số ("Intel Core" → bỏ "Core")
        if (!/\s/.test(model) && !/[0-9]/.test(model)) continue;
        if (model.length < 2 || model.length > 30) continue;
        const name = `${b} ${model}`;
        const key = norm(name);
        // Bắt giá gần vị trí nhắc đến
        const price = parsePriceVnd(text);
        let priceText: string | null = null;
        if (price) {
          const pm = text.match(/(?:giá|cost|price)[:\s]*([\d.,]+\s*(?:₫|đ|dong|triệu|tr\b|k\b)?)/i) ||
                      text.match(/([\d.,]+\s*(?:₫|đ|dong|triệu|tr\b))/i);
          priceText = pm ? pm[1].trim().slice(0, 30) : formatVnd(price);
        }
        if (!mentions.has(key)) {
          mentions.set(key, { name, brand: b, count: 0, urls: [], priceText: null });
        }
        const e = mentions.get(key)!;
        e.count++;
        if (!e.urls.includes(r)) e.urls.push(r);
        if (!e.priceText && priceText) e.priceText = priceText;
      }
    }
  }

  let list = [...mentions.values()]
    .filter((e) => e.count >= 1 && e.name.replace(/[^a-zA-Z0-9]/g, "").length >= 5)
    .sort((a, b) => b.count - a.count || b.urls.length - a.urls.length);

  // Gộp trùng heuristic: tên này chứa tên kia → giữ bản dài hơn;
  // hoặc cùng hãng + trùng ≥2 token model (kể cả token có số) → gộp
  const modelTokens = (n: string) =>
    norm(n).split(/\s+/).filter((w) => w.length > 1);
  const merged: Mention[] = [];
  for (const e of list) {
    const nk = norm(e.name);
    const ntoks = modelTokens(e.name);
    const dup = merged.find((x) => {
      const xk = norm(x.name);
      if (nk.includes(xk) || xk.includes(nk)) return true;
      const xtoks = modelTokens(x.name);
      if (norm(x.brand) !== norm(e.brand)) return false;
      const shared = ntoks.filter((t) => xtoks.includes(t));
      return shared.length >= 2 || shared.some((t) => /[0-9]/.test(t) && t.length > 2);
    });
    if (dup) {
      if (e.name.length > dup.name.length) dup.name = e.name;
      dup.count += e.count;
      for (const u of e.urls) if (!dup.urls.includes(u)) dup.urls.push(u);
      if (!dup.priceText && e.priceText) dup.priceText = e.priceText;
    } else {
      merged.push({ ...e });
    }
  }

  // LLM chuẩn hoá tên (nhanh, 1 call) — fallback giữ nguyên nếu lỗi
  if (deepNormalize && merged.length >= 2) {
    const normPrompt =
      `Dưới đây là các tên sản phẩm được trích xuất tự động, có thể trùng lặp hoặc sai chính tả. ` +
      `Hãy CHỈ trả về JSON array các tên CHUẨN đã gộp trùng, giữ nguyên tên đúng nhất. ` +
      `Định dạng: ["Tên chuẩn 1","Tên chuẩn 2",...]. Không bịa thêm sản phẩm mới.\n` +
      merged.slice(0, 8).map((e) => `- ${e.name} (nhắc ${e.count} lần)`).join("\n");
    const clean = await llmJson<string[]>(normPrompt, null as unknown as string[]);
    if (Array.isArray(clean) && clean.length) {
      const byNorm = new Map(merged.map((e) => [norm(e.name), e]));
      const final: Mention[] = [];
      for (const n of clean.slice(0, 8)) {
        const k = norm(n);
        const hit = byNorm.get(k) || merged.find((e) => k.includes(norm(e.name)) || norm(e.name).includes(k));
        if (hit && !final.includes(hit)) final.push(hit);
      }
      if (final.length >= 2) {
        return final.map((e) => ({ name: e.name, brand: e.brand, priceText: e.priceText, specs: {}, urls: e.urls.slice(0, 5) }));
      }
    }
  }

  return merged.slice(0, 7).map((e) => ({
    name: e.name, brand: e.brand, priceText: e.priceText, specs: {}, urls: e.urls.slice(0, 5),
  }));
}

// Gom bằng chứng: gom snippet theo sản phẩm
export function attachEvidence(
  candidates: { name: string; urls: WebResult[] }[],
  results: WebResult[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const c of candidates) {
    const ev: string[] = [];
    const nameTokens = norm(c.name).split(" ").filter((w) => w.length > 2);
    for (const r of results) {
      const hay = norm(r.title + " " + r.snippet);
      const hits = nameTokens.filter((t) => hay.includes(t)).length;
      if (hits >= Math.min(2, nameTokens.length) || c.urls.includes(r)) {
        if (r.snippet) ev.push(`[${r.source}] ${r.snippet.slice(0, 200)}`);
      }
      if (ev.length >= 6) break;
    }
    map.set(c.name, ev);
  }
  return map;
}

// ---- Chấm điểm cá nhân hoá ----
export function scoreProducts(
  candidates: { name: string; brand: string; priceText: string | null; specs: Record<string, string>; urls: WebResult[] }[],
  evidence: Map<string, string[]>,
  intent: Intent
): Product[] {
  const prices = candidates.map((c) => parsePriceVnd(c.priceText || ""));
  const validPrices = prices.filter((p): p is number => p != null);

  return candidates.map((c, idx) => {
    const ev = evidence.get(c.name) || [];
    const evText = norm(ev.join(" "));
    const price = parsePriceVnd(c.priceText || "");

    // 1. Khớp yêu cầu (features)
    const feats = [...intent.features, ...intent.mustHave, ...intent.emphasis];
    let featHits = 0;
    for (const f of feats) {
      const tokens = norm(f).split(" ").filter((w) => w.length > 2);
      if (tokens.length && tokens.every((t) => evText.includes(t))) featHits++;
    }
    const reqScore = feats.length ? Math.min(10, (featHits / feats.length) * 10) : 6;

    // 2. Phù hợp ngân sách
    let budgetScore = 6;
    if (intent.budgetVnd && price) {
      budgetScore = price <= intent.budgetVnd ? 10 : Math.max(1, 10 - ((price - intent.budgetVnd) / intent.budgetVnd) * 10);
    } else if (intent.budgetVnd && !price) {
      budgetScore = 5;
    }

    // 3. Giá trị (P/P): rẻ hơn trung vị trong nhóm → điểm cao
    let valueScore = 6;
    if (price && validPrices.length >= 2) {
      const sorted = [...validPrices].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      valueScore = Math.max(2, Math.min(10, 10 - ((price - median) / median) * 8));
    }

    // 4. Độ phủ nguồn
    const types = new Set(c.urls.map((u) => sourceTypeOf(u.url)));
    const sourceScore = Math.min(10, 3 + types.size * 2 + Math.min(3, c.urls.length));

    // 5. Độ tin cậy thương hiệu / bảo hành
    const reliable = /bao hanh|chinh hang|warranty/i.test(evText) ? 8 : 6;

    // Trọng số động theo emphasis
    let wReq = 0.3, wBudget = 0.2, wValue = 0.15, wSource = 0.15, wRel = 0.1, wUx = 0.1;
    const emphN = norm(intent.emphasis.join(" "));
    if (/gia|re/.test(emphN)) { wValue = 0.25; wBudget = 0.25; wReq = 0.2; }
    if (intent.mustHave.length) wReq = 0.35;

    const uxScore = /thoai mai|trai nghiem tot|danh gia cao|tot/i.test(evText) ? 8 : 6;

    const total = reqScore * wReq + budgetScore * wBudget + valueScore * wValue + sourceScore * wSource + reliable * wRel + uxScore * wUx;

    const sources = c.urls.slice(0, 4).map((u) => ({
      name: u.source,
      url: u.url,
      type: sourceTypeOf(u.url),
    }));

    const hasOfficial = types.has("official");
    const confidence: Product["confidence"] =
      hasOfficial && c.urls.length >= 3 ? "high" : c.urls.length >= 2 ? "medium" : "low";

    return {
      id: `p${idx}`,
      name: c.name,
      brand: c.brand,
      category: intent.categoryVi,
      priceVnd: price,
      priceText: c.priceText || formatVnd(price),
      priceSource: c.urls[0]?.source || null,
      specs: c.specs,
      features: feats.filter((f) => evText.includes(norm(f).split(" ")[0] || "")),
      pros: [],
      cons: [],
      bestFor: "",
      score: Math.round(total * 10) / 10,
      scoreBreakdown: [
        { label: "Khớp yêu cầu", value: Math.round(reqScore * 10) / 10, weight: wReq },
        { label: "Ngân sách", value: Math.round(budgetScore * 10) / 10, weight: wBudget },
        { label: "Giá trị (P/P)", value: Math.round(valueScore * 10) / 10, weight: wValue },
        { label: "Nguồn tin", value: Math.round(sourceScore * 10) / 10, weight: wSource },
        { label: "Độ tin cậy", value: reliable, weight: wRel },
      ],
      confidence,
      sources,
      evidence: ev,
    };
  }).sort((a, b) => b.score - a.score);
}

// Ưu/nhược điểm bằng LLM từ bằng chứng (fallback template)
export async function enrichProsCons(products: Product[], intent: Intent): Promise<void> {
  await Promise.all(
    products.slice(0, 3).map(async (p) => {
      const evText = p.evidence.slice(0, 5).join("\n");
      const prompt =
        `Bạn là chuyên gia đánh giá sản phẩm. Dựa CHỈ vào bằng chứng dưới đây về "${p.name}" (nhu cầu người dùng: "${intent.rawQuery}"), ` +
        `hãy trả về JSON duy nhất, không thêm chữ nào khác: {"pros":["ưu điểm 1","ưu điểm 2","ưu điểm 3"],"cons":["nhược điểm 1","nhược điểm 2"],"best_for":"<đối tượng phù hợp nhất, 1 câu>"}\n` +
        `QUAN TRỌNG: không bịa thông số/khuyến nghị ngoài bằng chứng. Nếu bằng chứng ít, pros/cons ngắn gọn và trung thực.\nBằng chứng:\n${evText || "(không có bằng chứng chi tiết)"}`;
      const r = await llmJson<{ pros?: string[]; cons?: string[]; best_for?: string }>(prompt, null as unknown as { pros?: string[] });
      if (r && (r.pros?.length || r.cons?.length)) {
        p.pros = (r.pros || []).slice(0, 4);
        p.cons = (r.cons || []).slice(0, 3);
        p.bestFor = r.best_for || "";
      } else {
        // Fallback template từ features
        p.pros = p.features.slice(0, 3).map((f) => `Đáp ứng tiêu chí "${f}" của bạn`);
        if (!p.pros.length) p.pros = ["Được nhắc đến nhiều trong kết quả tìm kiếm"];
        p.cons = ["Chưa có đủ dữ liệu đánh giá chi tiết"];
        p.bestFor = `Người cần ${intent.categoryVi} ${intent.budgetText || "giá tốt"}`;
      }
    })
  );
}
