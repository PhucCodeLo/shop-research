// Định nghĩa danh mục sản phẩm: từ khoá nhận diện + chiến lược nghiên cứu

export interface CategoryDef {
  key: string;
  vi: string;
  en: string;
  keywords: string[]; // từ khoá tiếng Việt không dấu để nhận diện
  aspects: string[]; // khía cạnh cần tập trung khi nghiên cứu
  queryTemplates: string[];
  brands: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "smartphone",
    en: "smartphones",
    vi: "điện thoại",
    keywords: ["dien thoai", "smartphone", "iphone", "dien thoai", "mobile"],
    aspects: ["chip/SoC", "RAM", "bộ nhớ", "màn hình", "camera", "pin", "sạc nhanh", "kháng nước IP", "cập nhật phần mềm"],
    queryTemplates: [
      "điện thoại {budget} tốt nhất 2026",
      "điện thoại {feature} đánh giá chi tiết",
      "so sánh điện thoại {budget} camera đẹp pin trâu",
    ],
    brands: ["Apple", "Samsung", "Xiaomi", "OPPO", "vivo", "Realme", "OnePlus", "Google", "Honor", "Nothing"],
  },
  {
    key: "laptop",
    en: "laptops",
    vi: "laptop",
    keywords: ["laptop", "may tinh xach tay", "macbook", "notebook"],
    aspects: ["CPU", "GPU/VRAM", "RAM", "nâng cấp RAM/SSD", "màn hình", "tản nhiệt", "pin", "trọng lượng", "cổng kết nối"],
    queryTemplates: [
      "laptop {budget} tốt nhất 2026",
      "laptop {feature} review chi tiết",
      "laptop {budget} cho lập trình đồ họa",
    ],
    brands: ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "LG", "Gigabyte"],
  },
  {
    key: "headphones",
    en: "earbuds headphones",
    vi: "tai nghe",
    keywords: ["tai nghe", "headphone", "earbud", "tws", "loa bluetooth", "speaker"],
    aspects: ["chất âm/bass", "chống ồn ANC", "codec", "pin", "micro", "đeo thoải mái", "app/EQ", "độ trễ"],
    queryTemplates: [
      "tai nghe {budget} tốt nhất 2026",
      "tai nghe {feature} đánh giá",
      "so sánh tai nghe {budget} bass mạnh ANC",
    ],
    brands: ["Sony", "JBL", "Soundcore", "Apple", "Samsung", "Bose", "Sennheiser", "Edifier", "Marshall", "Baseus", "Xiaomi"],
  },
  {
    key: "tablet",
    en: "tablets",
    vi: "máy tính bảng",
    keywords: ["may tinh bang", "tablet", "ipad"],
    aspects: ["chip", "màn hình", "bút cảm ứng", "pin", "loa", "phụ kiện bàn phím"],
    queryTemplates: ["máy tính bảng {budget} tốt nhất", "tablet {feature} đánh giá"],
    brands: ["Apple", "Samsung", "Xiaomi", "Lenovo", "Huawei"],
  },
  {
    key: "smartwatch",
    en: "smartwatches",
    vi: "đồng hồ thông minh",
    keywords: ["dong ho thong minh", "smartwatch", "watch"],
    aspects: ["pin", "cảm biến sức khoẻ", "GPS", "kháng nước", "màn hình", "tương thích điện thoại"],
    queryTemplates: ["đồng hồ thông minh {budget} tốt nhất", "smartwatch {feature} đánh giá"],
    brands: ["Apple", "Samsung", "Xiaomi", "Huawei", "Amazfit", "Garmin", "Fitbit"],
  },
  {
    key: "tv",
    en: "TVs",
    vi: "tivi",
    keywords: ["tivi", "tv ", "smart tv"],
    aspects: ["tấm nền QLED/OLED", "tần số quét", "HDR", "công suất loa", "hệ điều hành", "cổng HDMI"],
    queryTemplates: ["tivi {budget} tốt nhất", "smart tivi {feature} đánh giá"],
    brands: ["Samsung", "LG", "Sony", "TCL", "Xiaomi", "Coocaa"],
  },
  {
    key: "monitor",
    en: "monitors",
    vi: "màn hình",
    keywords: ["man hinh", "monitor"],
    aspects: ["kích thước", "độ phân giải", "tần số quét", "tấm nền IPS/VA", "độ phủ màu", "cổng kết nối"],
    queryTemplates: ["màn hình {budget} tốt nhất", "monitor {feature} đánh giá"],
    brands: ["Dell", "LG", "Samsung", "Asus", "Acer", "Gigabyte", "ViewSonic"],
  },
  {
    key: "camera",
    en: "cameras",
    vi: "máy ảnh",
    keywords: ["may anh", "camera", "may quay"],
    aspects: ["cảm biến", "ống kính", "quay video", "chống rung", "lấy nét", "pin"],
    queryTemplates: ["máy ảnh {budget} tốt nhất", "camera {feature} đánh giá"],
    brands: ["Canon", "Sony", "Nikon", "Fujifilm", "Panasonic"],
  },
  {
    key: "appliance",
    en: "home appliances",
    vi: "đồ gia dụng",
    keywords: ["may loc khong khi", "robot hut bui", "may hut bui", "dieu hoa", "may giat", "tu lanh", "noi chien khong dau", "may rua bat", "gia dung"],
    aspects: ["công suất", "dung tích", "độ ồn", "tiết kiệm điện", "bảo hành", "dễ vệ sinh", "độ bền"],
    queryTemplates: ["{categoryvi} {budget} tốt nhất", "{categoryvi} {feature} đánh giá", "so sánh {categoryvi} {budget}"],
    brands: ["Xiaomi", "Dyson", "Philips", "Panasonic", "Samsung", "LG", "Electrolux", "Toshiba", "Sharp", "Ecovacs", "Roborock", "Dreame"],
  },
  {
    key: "shoes",
    en: "running shoes",
    vi: "giày",
    keywords: ["giay", "giay chay bo", "sneaker", "giay the thao"],
    aspects: ["trọng lượng", "đệm", "độ ổn định", "độ bền đế", "thoáng khí", "phù hợp chân"],
    queryTemplates: ["giày {budget} tốt nhất", "giày chạy bộ {feature} đánh giá"],
    brands: ["Nike", "Adidas", "Asics", "New Balance", "Puma", "Saucony", "Hoka"],
  },
  {
    key: "fashion",
    en: "fashion",
    vi: "thời trang",
    keywords: ["ao ", "quan ", "vay ", "thoi trang", "tui xach", "balo"],
    aspects: ["chất liệu", "form dáng", "độ bền", "dễ phối đồ", "chính hãng"],
    queryTemplates: ["{categoryvi} {budget} đẹp", "{categoryvi} {feature} đánh giá"],
    brands: ["Uniqlo", "Zara", "H&M", "Nike", "Adidas", "Levi's"],
  },
  {
    key: "beauty",
    en: "beauty products",
    vi: "mỹ phẩm",
    keywords: ["my pham", "kem ", "serum", "son ", "sua rua mat", "beauty", "skincare"],
    aspects: ["thành phần", "loại da phù hợp", "dung tích", "xuất xứ", "chính hãng"],
    queryTemplates: ["{categoryvi} {budget} tốt nhất", "{categoryvi} {feature} review"],
    brands: ["La Roche-Posay", "CeraVe", "Kiehl's", "Innisfree", "Laneige", "Vichy"],
  },
  {
    key: "pc",
    en: "PC components",
    vi: "linh kiện PC",
    keywords: ["pc ", "vga", "card do hoa", "cpu ", "mainboard", "ram pc", "ssd ", "nguon may tinh", "case pc", "gaming gear", "ban phim co", "chuot gaming"],
    aspects: ["hiệu năng", "tương thích", "tản nhiệt", "điện năng", "bảo hành"],
    queryTemplates: ["{categoryvi} {budget} tốt nhất", "{categoryvi} {feature} đánh giá"],
    brands: ["NVIDIA", "AMD", "Intel", "Asus", "MSI", "Gigabyte", "Logitech", "Corsair"],
  },
  {
    key: "vehicle",
    en: "motorcycles",
    vi: "xe",
    keywords: ["xe may", "o to", "oto", "xe dien", "motorcycle", "car"],
    aspects: ["động cơ", "tiêu hao nhiên liệu", "an toàn", "bảo hành", "chi phí bảo dưỡng", "giữ giá"],
    queryTemplates: ["{categoryvi} {budget} tốt nhất", "{categoryvi} {feature} đánh giá"],
    brands: ["Honda", "Yamaha", "Toyota", "Hyundai", "Kia", "Mazda", "VinFast"],
  },
  {
    key: "furniture",
    en: "furniture",
    vi: "nội thất",
    keywords: ["ban ", "ghe ", "giuong", "tu quan ao", "sofa", "noi that", "den ban"],
    aspects: ["chất liệu", "kích thước", "độ chắc chắn", "dễ lắp ráp", "bảo hành"],
    queryTemplates: ["{categoryvi} {budget} tốt nhất", "{categoryvi} {feature} đánh giá"],
    brands: ["IKEA", "Hòa Phát", "Xuân Hòa"],
  },
  {
    key: "sports",
    en: "sports equipment",
    vi: "đồ thể thao",
    keywords: ["vo cau long", "bong da", "yoga", "gym", "the thao", "xe dap"],
    aspects: ["chất liệu", "độ bền", "phù hợp trình độ", "trọng lượng"],
    queryTemplates: ["{categoryvi} {budget} tốt nhất", "{categoryvi} {feature} đánh giá"],
    brands: ["Yonex", "Victor", "Decathlon"],
  },
  {
    key: "baby",
    en: "baby products",
    vi: "đồ cho bé",
    keywords: ["be ", "tre em", "sua ", "ta dan", "xe day", "baby"],
    aspects: ["an toàn", "chất liệu", "độ tuổi phù hợp", "chính hãng", "dễ vệ sinh"],
    queryTemplates: ["{categoryvi} {budget} tốt nhất", "{categoryvi} {feature} đánh giá"],
    brands: ["Pigeon", "Huggies", "Merries", "Combi"],
  },
  {
    key: "gift",
    en: "gifts",
    vi: "quà tặng",
    keywords: ["qua tang", "qua ", "gift"],
    aspects: ["ý nghĩa", "độ tuổi/người nhận", "hộp quà", "giá trị sử dụng"],
    queryTemplates: ["quà tặng {budget} ý nghĩa", "quà công nghệ {budget}"],
    brands: [],
  },
  {
    key: "general",
    en: "products",
    vi: "sản phẩm",
    keywords: [],
    aspects: ["tính năng", "độ bền", "giá", "bảo hành", "đánh giá người dùng"],
    queryTemplates: ["{categoryvi} {budget} tốt nhất", "{categoryvi} {feature} đánh giá"],
    brands: [],
  },
];

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9 .]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCategory(q: string): CategoryDef {
  const n = " " + norm(q) + " ";
  for (const c of CATEGORIES) {
    if (c.key === "general") continue;
    if (c.keywords.some((k) => n.includes(" " + k) || n.includes(k + " "))) {
      return c;
    }
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

export function parseBudget(q: string): { vnd: number | null; text: string | null } {
  const n = norm(q);
  let m = n.match(/duoi\s*([\d.,]+)\s*(trieu|tr|ty|k|nghin|ngan)/);
  if (m) {
    const v = parseFloat(m[1].replace(",", "."));
    const mult =
      m[2] === "ty" ? 1e9 : m[2] === "trieu" || m[2] === "tr" ? 1e6 : 1e3;
    const vnd = Math.round(v * mult);
    return { vnd, text: `dưới ${m[1].replace(".", ",")} ${m[2] === "k" || m[2] === "nghin" || m[2] === "ngan" ? "k" : m[2] === "ty" ? "tỷ" : "triệu"}` };
  }
  m = n.match(/([\d.,]+)\s*(trieu|tr|ty)\s*(do lai|tro xuong|tro lai)/);
  if (m) {
    const v = parseFloat(m[1].replace(",", "."));
    const vnd = Math.round(v * (m[2] === "ty" ? 1e9 : 1e6));
    return { vnd, text: `dưới ${m[1]} ${m[2] === "ty" ? "tỷ" : "triệu"}` };
  }
  if (n.includes("gia re") || n.includes("binh dan") || n.includes("re ")) {
    return { vnd: null, text: "giá rẻ" };
  }
  return { vnd: null, text: null };
}
