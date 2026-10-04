import { NextRequest, NextResponse } from "next/server";
import { Intent, ResearchResult, SessionState, Product } from "@/lib/agent/types";
import { extractIntent, classifyFollowUp } from "@/lib/agent/intent";
import { buildQueries, multiSearch } from "@/lib/agent/search";
import { extractCandidates, attachEvidence, scoreProducts, enrichProsCons, formatVnd } from "@/lib/agent/research";
import { detectCategory, CATEGORIES } from "@/lib/agent/categories";
import { llmText } from "@/lib/agent/llm";

export const maxDuration = 120;

function emptySession(): SessionState {
  return {
    intent: {
      category: "general", categoryVi: "sản phẩm", budgetVnd: null, budgetText: null,
      features: [], mustHave: [], useCase: null, brandPref: null, excludeBrands: [],
      minSpecs: {}, emphasis: [], isComparison: false, compareNames: [], rawQuery: "",
    },
    products: [],
  };
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const steps: string[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    const query: string = (body.query || "").toString().trim();
    const prevSession: SessionState | null = body.session || null;

    if (!query) {
      return NextResponse.json({
        ok: false, error: "Bạn chưa nhập nhu cầu. Hãy cho AI biết bạn đang tìm sản phẩm gì nhé!",
        steps: [], intent: null, best: null, alternatives: [], whyBest: [], bestCons: [],
        comparisonTable: null, dataNote: "", session: null, durationMs: 0,
      } satisfies ResearchResult);
    }

    // --- Follow-up: điều chỉnh trên kết quả cũ, không tìm lại từ đầu ---
    if (prevSession && prevSession.products.length) {
      const adj = await classifyFollowUp(query, prevSession.intent);
      if (adj.action !== "new_search") {
        steps.push(`Hiểu follow-up: "${query}" → điều chỉnh trên ${prevSession.products.length} sản phẩm đã tìm (không tìm lại từ đầu).`);
        let products = [...prevSession.products];
        const intent = { ...prevSession.intent };
        if (adj.action === "exclude") {
          const n = query.toLowerCase();
          products = products.filter((p) => !n.includes(p.brand.toLowerCase()) && !n.includes(p.name.toLowerCase().split(" ")[0]));
          steps.push("Đã loại bỏ sản phẩm/hãng bạn không thích.");
        }
        if (adj.action === "reweight") {
          for (const p of products) {
            p.score = Math.min(10, p.score + 0.5);
          }
          products.sort((a, b) => b.score - a.score);
          intent.emphasis = [...intent.emphasis, query];
          steps.push("Đã tăng trọng số cho tiêu chí bạn nhấn mạnh và xếp hạng lại.");
        }
        if (adj.action === "require") {
          intent.mustHave = [...intent.mustHave, query];
          steps.push("Đã ghi nhận yêu cầu mới và lọc lại danh sách.");
        }
        const [best, ...rest] = products;
        return NextResponse.json({
          ok: true, steps, intent,
          best: best || null, alternatives: rest.slice(0, 6),
          whyBest: best ? [`Phù hợp nhất sau khi điều chỉnh theo "${query}"`, `Điểm tổng: ${best.score}/10`] : [],
          bestCons: best?.cons || [],
          comparisonTable: null,
          dataNote: "Kết quả điều chỉnh từ phiên tìm kiếm trước, không tìm web lại.",
          session: { intent, products },
          durationMs: Date.now() - t0,
        } satisfies ResearchResult);
      }
    }

    // --- Bước 1: Hiểu ý định ---
    steps.push("Hiểu nhu cầu của bạn (danh mục, ngân sách, tính năng)…");
    const intent: Intent = await extractIntent(query);
    const cat = CATEGORIES.find((c) => c.key === intent.category) || detectCategory(query);
    steps.push(
      `Đã hiểu: tìm ${intent.categoryVi}` +
        (intent.budgetText ? ` ${intent.budgetText}` : "") +
        (intent.useCase ? ` để ${intent.useCase}` : "") +
        (intent.features.length ? `, ưu tiên: ${intent.features.slice(0, 3).join(", ")}` : "")
    );

    // --- Bước 2: Lập chiến lược tìm kiếm ---
    const queries = buildQueries(intent.categoryVi, cat.en, intent.budgetText, [...intent.features, ...intent.mustHave], intent.useCase, cat.queryTemplates);
    steps.push(`Lập kế hoạch: ${queries.length} truy vấn web từ nhiều nguồn (hãng, nhà bán lẻ, review, cộng đồng)…`);

    // --- Bước 3: Tìm kiếm đa nguồn (2 pha) ---
    let results = await multiSearch(queries);
    if (!results.length) {
      return NextResponse.json({
        ok: false, error: "Không tìm được thông tin trên web lúc này. Bạn thử lại sau giây lát nhé!",
        steps, intent, best: null, alternatives: [], whyBest: [], bestCons: [],
        comparisonTable: null, dataNote: "", session: null, durationMs: Date.now() - t0,
      } satisfies ResearchResult);
    }
    steps.push(`Thu thập ${results.length} kết quả từ ${new Set(results.map((r) => r.source)).size} nguồn khác nhau…`);

    // --- Bước 4: Trích xuất & dedupe ứng viên ---
    let candidates = await extractCandidates(results, intent, cat.brands);

    // Pha 2: với ứng viên có tên model rõ ràng, tìm sâu thêm review + giá
    const hasRealName = (n: string) =>
      /[0-9]/.test(n) || n.trim().split(/\s+/).length >= 3;
    const named = candidates.filter((c) => hasRealName(c.name)).slice(0, 4);
    if (named.length >= 2) {
      steps.push(`Tìm sâu thêm về ${named.length} ứng viên nổi bật (review, giá)…`);
      const deep = await multiSearch(named.map((c) => `${c.name} review giá`));
      if (deep.length) {
        results = [...results, ...deep];
        candidates = await extractCandidates(results, intent, cat.brands);
      }
    }

    // Lọc rác: tên quá ngắn hoặc chung chung
    candidates = candidates.filter((c) => {
      const alnum = c.name.replace(/[^a-zA-Z0-9]/g, "");
      return alnum.length >= 4 && c.name.trim().split(/\s+/).length >= 2;
    });
    if (!candidates.length) {
      return NextResponse.json({
        ok: false, error: "Tìm thấy thông tin nhưng chưa tách được sản phẩm cụ thể. Bạn thử mô tả rõ tên sản phẩm hơn nhé!",
        steps, intent, best: null, alternatives: [], whyBest: [], bestCons: [],
        comparisonTable: null, dataNote: "", session: null, durationMs: Date.now() - t0,
      } satisfies ResearchResult);
    }
    steps.push(`Nhận diện ${candidates.length} ứng viên, gom bằng chứng theo từng sản phẩm…`);

    // --- Bước 5: Chấm điểm ---
    const evidence = attachEvidence(candidates, results);
    let products = scoreProducts(candidates, evidence, intent);
    // Lọc theo ngân sách cứng nếu có (cho phép vượt nhẹ 10%)
    if (intent.budgetVnd) {
      const within = products.filter((p) => !p.priceVnd || p.priceVnd <= intent.budgetVnd! * 1.1);
      if (within.length) products = within;
    }
    if (intent.excludeBrands.length) {
      products = products.filter((p) => !intent.excludeBrands.some((b) => p.brand.toLowerCase().includes(b.toLowerCase())));
    }
    steps.push("Chấm điểm cá nhân hoá theo ngân sách, tính năng và độ tin cậy nguồn…");

    // --- Bước 6: Ưu/nhược điểm ---
    await enrichProsCons(products, intent);
    steps.push("Tổng hợp ưu/nhược điểm từ bằng chứng…");

    const [best, ...rest] = products;

    // --- Bước 7: Giải thích "Vì sao AI chọn" ---
    let whyBest: string[] = [];
    if (best) {
      const fb = [
        ...(intent.budgetText && best.priceVnd && intent.budgetVnd && best.priceVnd <= intent.budgetVnd
          ? [`Đúng ngân sách ${intent.budgetText} (${formatVnd(best.priceVnd)})`] : []),
        ...best.pros.slice(0, 3).map((x) => x),
        `Điểm tổng ${best.score}/10 cao nhất trong nhóm`,
      ];
      const prompt =
        `Bạn là trợ lý mua sắm. Người dùng hỏi: "${query}". AI chọn "${best.name}" (giá ${best.priceText || "chưa rõ giá"}, điểm ${best.score}/10). ` +
        `Ưu điểm: ${best.pros.join("; ")}. Hãy viết 4-6 gạch đầu dòng NGẮN GỌN bằng tiếng Việt giải thích "Vì sao AI chọn sản phẩm này?", ` +
        `mỗi dòng bắt đầu bằng "✓ ". CHỈ dùng thông tin đã cho, không bịa thêm. Trả về thuần text, mỗi dòng một gạch đầu dòng.`;
      const text = await llmText(prompt, "");
      whyBest = text
        .split("\n")
        .map((l) => l.replace(/^[-*✓\s]+/, "").trim())
        .filter((l) => l.length > 3)
        .slice(0, 6)
        .map((l) => "✓ " + l);
      if (!whyBest.length) whyBest = fb.map((x) => (x.startsWith("✓") ? x : "✓ " + x));
    }

    // --- Bảng so sánh ---
    let comparisonTable: ResearchResult["comparisonTable"] = null;
    if (products.length >= 2) {
      const tops = products.slice(0, Math.min(4, products.length));
      const crit: [string, (p: Product) => string][] = [
        ["Giá tham khảo", (p) => p.priceText || "Chưa rõ"],
        ["Điểm tổng", (p) => `${p.score}/10`],
        ["Thương hiệu", (p) => p.brand],
        ["Ưu điểm nổi bật", (p) => p.pros.slice(0, 2).join("; ") || "—"],
        ["Nhược điểm chính", (p) => p.cons.slice(0, 2).join("; ") || "—"],
        ["Độ tin cậy", (p) => p.confidence === "high" ? "🟢 Cao" : p.confidence === "medium" ? "🟡 Trung bình" : "🔴 Thấp"],
      ];
      comparisonTable = {
        products: tops.map((p) => p.name),
        rows: crit.map(([criterion, fn]) => ({ criterion, values: tops.map(fn) })),
      };
    }

    const session: SessionState = { intent, products };

    return NextResponse.json({
      ok: true,
      steps,
      intent,
      best: best || null,
      alternatives: rest.slice(0, 6),
      whyBest,
      bestCons: best?.cons || [],
      comparisonTable,
      dataNote:
        "Giá và thông số lấy từ kết quả web công khai tại thời điểm tìm kiếm, luôn kèm nguồn. " +
        "AI không bịa giá/thông số — mục nào chưa xác thực được sẽ ghi rõ. Nên kiểm tra lại giá trước khi mua.",
      session,
      durationMs: Date.now() - t0,
    } satisfies ResearchResult);
  } catch (e) {
    console.error("research error", e);
    return NextResponse.json(
      {
        ok: false, error: "Có lỗi khi nghiên cứu. Bạn thử lại sau giây lát nhé!",
        steps, intent: null, best: null, alternatives: [], whyBest: [], bestCons: [],
        comparisonTable: null, dataNote: "", session: null, durationMs: Date.now() - t0,
      } satisfies ResearchResult,
      { status: 500 }
    );
  }
}
