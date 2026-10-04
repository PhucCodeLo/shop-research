// Trích xuất ý định mua sắm từ câu hỏi tiếng Việt.
// Ưu tiên LLM; fallback heuristic khi LLM lỗi.

import { Intent } from "./types";
import { llmJson } from "./llm";
import { detectCategory, parseBudget, norm, CATEGORIES } from "./categories";

interface LlmIntent {
  category?: string;
  category_vi?: string;
  budget_vnd?: number | null;
  budget_text?: string | null;
  features?: string[];
  must_have?: string[];
  use_case?: string | null;
  brand_pref?: string | null;
  exclude_brands?: string[];
  emphasis?: string[];
  is_comparison?: boolean;
  compare_names?: string[];
}

const CATEGORY_KEYS = CATEGORIES.map((c) => c.key).join(", ");

export async function extractIntent(query: string): Promise<Intent> {
  const prompt =
    `Bạn là trợ lý phân tích nhu cầu mua sắm. Đọc yêu cầu tiếng Việt sau và CHỈ trả về JSON hợp lệ, không thêm chữ nào khác.\n` +
    `Yêu cầu: "${query}"\n` +
    `Danh mục hợp lệ (chọn 1 key): ${CATEGORY_KEYS}\n` +
    `Định dạng JSON: {"category":"<key>","category_vi":"<tên tiếng Việt>","budget_vnd":<số tiền VND hoặc null>,"budget_text":"<vd: dưới 700k>","features":["tính năng mong muốn"],"must_have":["tính năng bắt buộc"],"use_case":"<mục đích sử dụng NÊU RÕ trong yêu cầu, nếu không có thì null>","brand_pref":"<thương hiệu ưa thích hoặc null>","exclude_brands":[],"emphasis":["tiêu chí được nhấn mạnh nhất"],"is_comparison":false,"compare_names":[]}\n` +
    `Quy tắc: 700k=700000, 25 triệu=25000000, 20tr=20000000. "quan trọng nhất"/"nhất" → đưa vào emphasis.`;

  const fallback = heuristicIntent(query);
  const r = await llmJson<LlmIntent>(prompt, null as unknown as LlmIntent);
  if (!r || !r.category) return fallback;

  const cat = CATEGORIES.find((c) => c.key === r.category) || detectCategory(query);
  const hb = parseBudget(query);
  return {
    category: cat.key,
    categoryVi: r.category_vi || cat.vi,
    budgetVnd: typeof r.budget_vnd === "number" ? r.budget_vnd : hb.vnd,
    budgetText: r.budget_text || hb.text,
    features: r.features || [],
    mustHave: r.must_have || [],
    useCase: r.use_case || null,
    brandPref: r.brand_pref || null,
    excludeBrands: r.exclude_brands || [],
    minSpecs: {},
    emphasis: r.emphasis || [],
    isComparison:
      !!r.is_comparison || /so sanh|vs\.?|doi chieu/i.test(query),
    compareNames: r.compare_names || [],
    rawQuery: query,
  };
}

function heuristicIntent(query: string): Intent {
  const cat = detectCategory(query);
  const hb = parseBudget(query);
  const n = norm(query);
  const features: string[] = [];
  for (const kw of ["bass", "anc", "chong on", "camera", "pin trau", "pin", "sac nhanh", "man hinh", "chip", "ram", "nhe", "ben", "dep", "re", "chinh hang"]) {
    if (n.includes(kw)) features.push(kw);
  }
  return {
    category: cat.key,
    categoryVi: cat.vi,
    budgetVnd: hb.vnd,
    budgetText: hb.text,
    features,
    mustHave: [],
    useCase: null,
    brandPref: null,
    excludeBrands: [],
    minSpecs: {},
    emphasis: [],
    isComparison: /so sanh|vs\.?|doi chieu/i.test(query),
    compareNames: [],
    rawQuery: query,
  };
}

// Phân loại follow-up: điều chỉnh trọng số / loại trừ / thêm yêu cầu
export async function classifyFollowUp(
  query: string,
  prevIntent: Intent
): Promise<{ action: "reweight" | "exclude" | "require" | "new_search"; detail: string }> {
  const n = norm(query);
  if (/khong thich|loai|tru ra|bo qua|khong mua/.test(n)) {
    return { action: "exclude", detail: query };
  }
  if (/quan trong|uu tien|chu y/.test(n)) {
    return { action: "reweight", detail: query };
  }
  if (/phai|bat buoc|toi thieu|tren|duoi/.test(n)) {
    return { action: "require", detail: query };
  }
  return { action: "new_search", detail: query };
}
