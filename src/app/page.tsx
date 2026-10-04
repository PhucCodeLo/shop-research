"use client";

import { useState } from "react";

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  priceVnd: number | null;
  priceText: string | null;
  priceSource: string | null;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
  bestFor: string;
  score: number;
  confidence: "high" | "medium" | "low";
  sources: { name: string; url: string; type: string }[];
}

interface CompareTableData {
  products: string[];
  rows: { criterion: string; values: string[] }[];
}

interface ResearchResult {
  ok: boolean;
  error?: string;
  steps: string[];
  intent: {
    categoryVi: string;
    budgetText: string | null;
    features: string[];
    useCase: string | null;
  } | null;
  best: Product | null;
  alternatives: Product[];
  whyBest: string[];
  bestCons: string[];
  comparisonTable: CompareTableData | null;
  dataNote: string;
  session: unknown;
  durationMs: number;
}

const EXAMPLES = [
  "Tìm cho anh tai nghe dưới 700k, bass mạnh, ANC tốt, nghe EDM.",
  "Laptop dưới 25 triệu để học AI và chạy model local.",
  "Điện thoại dưới 20 triệu, camera đẹp, chụp chân dung tốt, pin trâu.",
  "Tìm robot hút bụi tốt nhất cho nhà có thú cưng.",
  "Tìm giày chạy bộ cho người mới dưới 2 triệu.",
  "Tôi cần một món quà công nghệ dưới 1 triệu cho bạn nữ.",
];

const SOURCE_TYPE_LABEL: Record<string, string> = {
  official: "🏭 Hãng",
  retailer: "🏪 Bán lẻ",
  review: "📝 Review",
  community: "💬 Cộng đồng",
  video: "🎬 Video",
};

const CONF_LABEL = { high: "🟢 Cao", medium: "🟡 Trung bình", low: "🔴 Thấp" };

export default function Home() {
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  async function research(q: string, session?: unknown) {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true);
    setResult(null);
    setShowSteps(false);
    setShowCompare(false);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, session: session || null }),
      });
      const data: ResearchResult = await res.json();
      setResult(data);
    } catch {
      setResult({
        ok: false,
        error: "Không kết nối được máy chủ. Bạn kiểm tra mạng và thử lại nhé!",
        steps: [], intent: null, best: null, alternatives: [],
        whyBest: [], bestCons: [], comparisonTable: null,
        dataNote: "", session: null, durationMs: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pt-14">
      <header className="text-center">
        <div className="text-5xl">🛒</div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          AI Shopping Research
        </h1>
        <p className="mt-2 text-neutral-600">
          Trợ lý nghiên cứu mua sắm — tổng hợp đa nguồn, so sánh và gợi ý khách quan.
        </p>
      </header>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          research(query);
        }}
      >
        <label className="text-sm font-medium text-neutral-700">Tôi đang tìm...</label>
        <div className="mt-2 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="VD: tai nghe dưới 700k, bass mạnh, ANC tốt, nghe EDM"
            className="min-w-0 flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm outline-none placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "…" : "🔍 Nghiên cứu"}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQuery(ex);
              research(ex);
            }}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-left text-xs text-neutral-600 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700"
          >
            {ex.length > 52 ? ex.slice(0, 52) + "…" : ex}
          </button>
        ))}
      </div>

      <hr className="my-8 border-neutral-200" />

      {loading && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-4 font-semibold">Đang nghiên cứu...</p>
          <p className="mt-1 text-sm text-neutral-500">
            Agent đang tìm kiếm đa nguồn và phân tích sản phẩm. Việc này có thể mất 30–60 giây.
          </p>
        </div>
      )}

      {!loading && result && !result.ok && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <div className="text-4xl">😕</div>
          <p className="mt-3 font-semibold">{result.error}</p>
          {result.steps.length > 0 && (
            <button onClick={() => setShowSteps((s) => !s)} className="mt-3 text-sm text-neutral-500 underline">
              {showSteps ? "Ẩn chi tiết agent" : "Xem agent đã làm gì"}
            </button>
          )}
          {showSteps && <StepsList steps={result.steps} />}
        </div>
      )}

      {!loading && result && result.ok && result.best && (
        <section className="space-y-6">
          {result.intent && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="self-center text-neutral-500">Agent hiểu:</span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-800">📦 {result.intent.categoryVi}</span>
              {result.intent.budgetText && (
                <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-800">💰 {result.intent.budgetText}</span>
              )}
              {result.intent.useCase && (
                <span className="rounded-full bg-purple-100 px-2.5 py-1 font-medium text-purple-800">🎯 {result.intent.useCase}</span>
              )}
              {result.intent.features.slice(0, 3).map((f) => (
                <span key={f} className="rounded-full bg-neutral-100 px-2.5 py-1 font-medium text-neutral-700">✨ {f}</span>
              ))}
            </div>
          )}

          <button onClick={() => setShowSteps((s) => !s)} className="text-sm text-neutral-500 underline">
            {showSteps ? "Ẩn chi tiết agent" : "Xem agent đã làm gì"}
          </button>
          {showSteps && <StepsList steps={result.steps} />}

          {/* BEST MATCH */}
          <div className="rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">🥇 Kết quả tốt nhất</h2>
              <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-bold text-white">
                {result.best.score}/10
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold">{result.best.name}</h3>
            <p className="mt-1 text-sm text-neutral-500">
              {result.best.brand} · Giá tham khảo:{" "}
              <span className="font-semibold text-neutral-800">
                {result.best.priceText || "Chưa rõ"}
              </span>
              {result.best.priceSource && (
                <span className="text-xs"> (nguồn: {result.best.priceSource})</span>
              )}
              {" · "}Độ tin cậy: {CONF_LABEL[result.best.confidence]}
            </p>
            {result.best.bestFor && (
              <p className="mt-2 text-sm italic text-neutral-600">👤 {result.best.bestFor}</p>
            )}

            <div className="mt-4 rounded-xl bg-indigo-50 p-4">
              <p className="text-sm font-bold text-indigo-900">Vì sao AI chọn sản phẩm này?</p>
              <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                {result.whyBest.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              {result.bestCons.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-bold text-neutral-700">Điểm trừ:</p>
                  <ul className="mt-1 space-y-1 text-sm text-neutral-600">
                    {result.bestCons.map((c, i) => (
                      <li key={i}>⚠ {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-bold text-green-700">Ưu điểm</p>
                <ul className="mt-1 space-y-1 text-sm text-neutral-700">
                  {result.best.pros.map((p, i) => (
                    <li key={i}>✓ {p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-bold text-red-700">Nhược điểm</p>
                <ul className="mt-1 space-y-1 text-sm text-neutral-700">
                  {result.best.cons.map((c, i) => (
                    <li key={i}>✕ {c}</li>
                  ))}
                </ul>
              </div>
            </div>

            <SourcePanel product={result.best} />
          </div>

          {/* So sánh */}
          {result.comparisonTable && (
            <div>
              <button
                onClick={() => setShowCompare((s) => !s)}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:border-indigo-400"
              >
                {showCompare ? "Ẩn bảng so sánh" : "📊 So sánh các lựa chọn"}
              </button>
              {showCompare && <CompareTable table={result.comparisonTable} />}
            </div>
          )}

          {/* Lựa chọn khác */}
          {result.alternatives.length > 0 && (
            <div>
              <h2 className="text-lg font-bold">Lựa chọn thay thế</h2>
              <div className="mt-3 space-y-4">
                {result.alternatives.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}

          {result.dataNote && (
            <p className="text-center text-xs text-neutral-400">{result.dataNote}</p>
          )}

          {/* Follow-up */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">💬 Hỏi thêm / điều chỉnh</p>
            <p className="mt-1 text-xs text-neutral-500">
              VD: “Camera quan trọng hơn.” · “Không thích hãng X.” · “Pin phải trên 5.000 mAh.”
            </p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                research(followUp, result.session);
                setFollowUp("");
              }}
            >
              <input
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Điều chỉnh tiêu chí…"
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={loading || !followUp.trim()}
                className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Gửi
              </button>
            </form>
          </div>
        </section>
      )}

      {!loading && !result && (
        <div className="text-center text-neutral-400">
          <div className="text-4xl">🤖</div>
          <p className="mt-3 text-sm">
            Mô tả nhu cầu mua sắm của bạn — AI sẽ nghiên cứu đa nguồn và gợi ý khách quan.
          </p>
        </div>
      )}

      <footer className="mt-12 text-center text-xs text-neutral-400">
        Shopping Research Agent — tổng hợp thông tin công khai, không bịa giá/thông số.
      </footer>
    </main>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold">{p.name}</h3>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700">
          {p.score}/10
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {p.brand} · {p.priceText ? `Giá tham khảo: ${p.priceText}` : "Giá: Chưa rõ"}
        {p.priceSource ? ` (${p.priceSource})` : ""} · {CONF_LABEL[p.confidence]}
      </p>
      {p.bestFor && <p className="mt-1 text-xs italic text-neutral-500">👤 {p.bestFor}</p>}
      <div className="mt-2 text-sm">
        <p><span className="font-medium text-green-700">✓ </span>{p.pros.slice(0, 2).join("; ") || "—"}</p>
        <p><span className="font-medium text-red-700">✕ </span>{p.cons.slice(0, 2).join("; ") || "—"}</p>
      </div>
      <button onClick={() => setOpen((o) => !o)} className="mt-2 text-xs text-neutral-500 underline">
        {open ? "Ẩn nguồn" : "📚 Xem nguồn"}
      </button>
      {open && <SourcePanel product={p} />}
    </article>
  );
}

function SourcePanel({ product: p }: { product: Product }) {
  if (!p.sources.length) return null;
  return (
    <div className="mt-3 rounded-xl bg-neutral-50 p-3">
      <p className="text-xs font-bold text-neutral-700">📚 Nguồn tham khảo</p>
      <ul className="mt-1 space-y-1">
        {p.sources.map((s, i) => (
          <li key={i} className="text-xs">
            <span className="mr-1 rounded bg-white px-1.5 py-0.5 font-medium text-neutral-600">
              {SOURCE_TYPE_LABEL[s.type] || "🔗"}
            </span>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline">
              {s.name}
            </a>
          </li>
        ))}
      </ul>
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent("mua " + p.name + " chính hãng")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold hover:border-indigo-400"
      >
        🔎 Tìm nơi mua
      </a>
    </div>
  );
}

function CompareTable({ table }: { table: CompareTableData }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-neutral-50">
            <th className="px-3 py-2 text-left font-bold">Tiêu chí</th>
            {table.products.map((n, i) => (
              <th key={i} className="px-3 py-2 text-left font-bold">
                {n.length > 28 ? n.slice(0, 28) + "…" : n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={row.criterion} className={ri % 2 ? "bg-neutral-50/50" : ""}>
              <td className="px-3 py-2 font-medium">{row.criterion}</td>
              {row.values.map((v, i) => (
                <td key={i} className="px-3 py-2 text-neutral-700">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepsList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-3 space-y-2 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50 p-4 text-left text-sm">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2">
          <span className="shrink-0 font-bold text-indigo-700">Bước {i + 1}:</span>
          <span className="text-neutral-700">{s}</span>
        </li>
      ))}
    </ol>
  );
}
