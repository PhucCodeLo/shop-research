// Kiểu dữ liệu dùng chung cho Shopping Research Agent

export interface Intent {
  category: string; // key: smartphone, laptop, headphones, ...
  categoryVi: string; // tên tiếng Việt: "điện thoại", "laptop", ...
  budgetVnd: number | null;
  budgetText: string | null;
  features: string[]; // tính năng mong muốn
  mustHave: string[]; // tính năng bắt buộc
  useCase: string | null; // mục đích sử dụng
  brandPref: string | null;
  excludeBrands: string[];
  minSpecs: Record<string, string>; // vd {pin: "5000mAh"}
  emphasis: string[]; // tiêu chí được nhấn mạnh ("camera quan trọng nhất")
  isComparison: boolean;
  compareNames: string[];
  rawQuery: string;
}

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
  source: string; // domain
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  priceVnd: number | null;
  priceText: string | null;
  priceSource: string | null;
  specs: Record<string, string>;
  features: string[];
  pros: string[];
  cons: string[];
  bestFor: string;
  score: number;
  scoreBreakdown: { label: string; value: number; weight: number }[];
  confidence: "high" | "medium" | "low";
  sources: { name: string; url: string; type: string }[];
  evidence: string[];
}

export interface ResearchResult {
  ok: boolean;
  error?: string;
  steps: string[];
  intent: Intent | null;
  best: Product | null;
  alternatives: Product[];
  whyBest: string[];
  bestCons: string[];
  comparisonTable: { products: string[]; rows: { criterion: string; values: string[] }[] } | null;
  dataNote: string;
  session: SessionState | null;
  durationMs: number;
}

export interface SessionState {
  intent: Intent;
  products: Product[];
}
