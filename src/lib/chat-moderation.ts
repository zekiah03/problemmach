// チャットメッセージの軽量モデレーション
// LLM 呼び出しはせず、低コストなパターンマッチで主要リスクを検知

const URL_PATTERN = /https?:\/\/|www\./i;
const LINE_ID_PATTERN = /(line|ﾗｲﾝ|ライン).*(id|ID|アカ)/i;
const MONEY_PATTERN = /(振込|振り込み|送金|paypay|amazon ?ギフト|電子マネー|お金|金額|有料|稼げる|月収|報酬|プレゼント企画)/i;
const CONTACT_PATTERN = /(070|080|090)[-－ー]?\d{3,4}[-－ー]?\d{3,4}/;

export type ChatModerationFlag =
  | "URL_DETECTED"
  | "EXTERNAL_CONTACT"
  | "MONEY_REQUEST"
  | "PHONE_DETECTED"
  | null;

export function flagChatMessage(text: string): ChatModerationFlag {
  if (URL_PATTERN.test(text)) return "URL_DETECTED";
  if (LINE_ID_PATTERN.test(text)) return "EXTERNAL_CONTACT";
  if (CONTACT_PATTERN.test(text)) return "PHONE_DETECTED";
  if (MONEY_PATTERN.test(text)) return "MONEY_REQUEST";
  return null;
}

// 警告メッセージ (UIで表示)
export const FLAG_WARNING: Record<NonNullable<ChatModerationFlag>, string> = {
  URL_DETECTED:
    "外部URLが含まれています。外部サイトへの誘導は詐欺の典型パターンです。",
  EXTERNAL_CONTACT:
    "外部SNSの連絡先が含まれている可能性があります。サービス外でのやり取りは安全が保証されません。",
  PHONE_DETECTED:
    "電話番号が含まれている可能性があります。個人情報の交換は慎重に。",
  MONEY_REQUEST:
    "金銭に関する文言が含まれています。お金の要求や送金提案は通報対象です。",
};
