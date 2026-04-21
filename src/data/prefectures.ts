// 47 都道府県 (地域順)
export const PREFECTURES = [
  "北海道",
  "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県",
  "沖縄県",
] as const;

export type Prefecture = (typeof PREFECTURES)[number];

export const AVAILABLE_SLOTS = [
  { value: "MORNING", label: "朝 (〜10時)" },
  { value: "DAYTIME", label: "日中 (10〜17時)" },
  { value: "EVENING", label: "夕方 (17〜21時)" },
  { value: "NIGHT", label: "夜 (21時〜)" },
  { value: "WEEKEND", label: "週末" },
] as const;

export const COST_TOLERANCE_OPTIONS = [
  { value: "FREE", label: "無料のみ" },
  { value: "LOW", label: "〜1000円" },
  { value: "MEDIUM", label: "〜5000円" },
  { value: "HIGH", label: "5000円以上も可" },
] as const;
