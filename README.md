# 🛒 Shop Research Agent — Trợ lý nghiên cứu mua sắm AI

Web app giúp nghiên cứu và quyết định mua sản phẩm: người dùng gõ nhu cầu bằng tiếng Việt tự nhiên,
AI tự hiểu ý định → lập chiến lược tìm kiếm → thu thập thông tin từ nhiều nguồn web công khai →
so sánh, chấm điểm cá nhân hoá và đưa ra gợi ý kèm nguồn dẫn chứng.

**Không phụ thuộc** Shopee / Lazada / Amazon API hay bất kỳ API trả phí nào.
**Không bịa** giá, thông số, review hay nguồn — mục nào chưa xác thực được sẽ ghi rõ.

## Demo

Chạy local rồi thử 6 câu hỏi mẫu ngay trên trang chủ:

1. Tìm tai nghe dưới 700k, bass mạnh, ANC tốt, nghe EDM.
2. Tìm điện thoại dưới 20 triệu, camera đẹp, chụp chân dung tốt, pin trâu.
3. Tìm laptop dưới 25 triệu để học AI, Python và chạy model local.
4. Tìm máy lọc không khí cho phòng ngủ dưới 5 triệu.
5. Tìm giày chạy bộ cho người mới dưới 2 triệu.
6. Tôi cần một món quà công nghệ dưới 1 triệu cho bạn nữ.

Hỗ trợ hội thoại tiếp nối: sau khi có kết quả, bạn có thể nói
"Camera quan trọng hơn", "Không thích máy cong", "Pin phải trên 5.000 mAh"
— AI điều chỉnh trên kết quả cũ thay vì tìm lại từ đầu.

## Kiến trúc

```
Câu hỏi tiếng Việt
  → extractIntent (LLM, fallback heuristic): danh mục, ngân sách, tính năng, mức độ ưu tiên
  → buildQueries: 4–6 truy vấn web theo danh mục (19 danh mục: điện thoại, laptop,
                   tai nghe, đồ gia dụng, giày, thời trang, mỹ phẩm, xe, quà tặng…)
  → multiSearch: tìm kiếm song song qua DuckDuckGo HTML
     (đi qua CORS proxy công cộng allorigins.win — miễn phí, không key —
      vì DDG chặn trực tiếp IP datacenter như Vercel)
  → extractCandidates: heuristic "Hãng + Model" trong tiêu đề/snippet, LLM gộp trùng tên
  → attachEvidence: gom bằng chứng (snippet) theo từng sản phẩm
  → scoreProducts: chấm điểm cá nhân hoá — khớp yêu cầu, ngân sách, giá trị P/P,
                   độ phủ nguồn, độ tin cậy (trọng số động theo tiêu chí nhấn mạnh)
  → enrichProsCons + "Vì sao AI chọn": LLM tổng hợp từ bằng chứng, có fallback template
  → Bảng so sánh + panel nguồn (hãng / bán lẻ / review / cộng đồng / video)
```

Mã nguồn chính:

- `src/app/api/research/route.ts` — workflow agent (7 bước), `maxDuration = 120`
- `src/lib/agent/intent.ts` — hiểu ý định + phân loại follow-up
- `src/lib/agent/categories.ts` — 19 danh mục, từ khoá nhận diện, mẫu truy vấn, ngân sách
- `src/lib/agent/search.ts` — tìm kiếm DuckDuckGo HTML qua proxy, phân loại nguồn
- `src/lib/agent/research.ts` — trích xuất ứng viên, chấm điểm, ưu/nhược điểm
- `src/lib/agent/llm.ts` — client LLM qua Pollinations (miễn phí, không key), luôn có fallback
- `src/app/page.tsx` — giao diện tiếng Việt, responsive, mobile-friendly

## Nguồn dữ liệu

| Loại | Ví dụ | Dùng cho |
|---|---|---|
| Hãng chính thức | apple.com, samsung.com, sony.com, anker.com… | thông số kỹ thuật (độ tin cậy cao) |
| Nhà bán lẻ | cellphones, fptshop, thegioididong, gearvn… | giá niêm yết, khuyến mãi, tình trạng hàng |
| Review chuyên nghiệp | soundguys, rtings, tech publications… | hiệu năng thực tế, điểm yếu |
| Cộng đồng | reddit, voz, tinhte, facebook công khai… | lỗi thường gặp, trải nghiệm dài hạn (giai thoại) |

Mọi con số quan trọng đều kèm nguồn và nhãn độ tin cậy 🟢/🟡/🔴.
Giá luôn ghi rõ loại: giá niêm yết / giá tham khảo / giá tìm được từ nhà bán lẻ.

## Biến môi trường

**Không cần API key nào để chạy.**
- Web search: DuckDuckGo HTML qua CORS proxy công cộng `allorigins.win` (miễn phí).
- LLM: Pollinations (miễn phí, không cần key).

`.env.example` có sẵn các biến tuỳ chọn nếu muốn thay LLM riêng:

```
LLM_API_URL=   # endpoint OpenAI-compatible (tuỳ chọn)
LLM_API_KEY=
LLM_MODEL=
```

> Lưu ý: code hiện tại luôn dùng Pollinations; các biến trên là placeholder cho nâng cấp sau.

## Chạy local

```bash
cd shop-research
npm install
npm run dev        # http://localhost:3000
npm run build      # kiểm tra build production
```

Yêu cầu: Node.js 20+.

## Triển khai

- **Vercel**: project Next.js chuẩn, không cần biến môi trường. Lưu ý API route có thể chạy
  tới ~60–90s cho mỗi nghiên cứu (nhiều lượt tìm kiếm + gọi LLM) — gói Hobby giới hạn
  60s/function cho một số region, cân nhắc gói Pro hoặc rút gọn số truy vấn khi deploy.
- **GitHub**: push source lên repo rồi import vào Vercel (khuyến nghị).

## Hạn chế đã biết (MVP)

- Giá và thông số lấy từ snippet kết quả tìm kiếm công khai tại thời điểm chạy — có thể
  lỗi thời; luôn kiểm tra lại giá trước khi mua.
- Tên sản phẩm trích xuất bằng heuristic "Hãng + Model" nên đôi khi gộp sai / tách trùng
  (ví dụ biến thể tên gần giống nhau); đang cải thiện bằng LLM gộp trùng.
- LLM miễn phí (Pollinations) đôi khi chậm, trả về tiếng Việt chưa mượt, hoặc từ chối
  — mọi bước đều có fallback heuristic/template nên app không sập.
- Web search đi qua proxy công cộng allorigins.win (vì DuckDuckGo chặn IP datacenter);
  nếu proxy chậm/sập, kết quả có thể ít hơn hoặc báo lỗi thân thiện.
- Chưa có cache, chưa lưu lịch sử server-side (session chỉ giữ ở client trong phiên chat).
