export const MAX_MESSAGE_CHARS = 2000;

const CRISIS_PATTERNS = [
  "tu tu", "tu sat", "muon chet", "khong muon song", "ket thuc cuoc doi", "ket lieu doi minh",
  "tu lam dau", "tu hai", "cat tay", "giet nguoi", "giet no",
];

const CRISIS_RE = new RegExp(String.raw`\b(?:${CRISIS_PATTERNS.join("|")})\b`);

/** Lowercase + strip Vietnamese accents so matching is robust to typing style. */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}

export function checkMessage(raw: string): { ok: true; text: string; crisis: boolean } | { ok: false; error: string } {
  const text = raw.trim();
  if (text.length < 3) return { ok: false, error: "Hãy chia sẻ thêm một chút để mình hiểu bạn hơn." };
  if (text.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_CHARS} ký tự).` };
  }
  const n = normalize(text);
  const crisis = CRISIS_RE.test(n);
  return { ok: true, text, crisis };
}

export function crisisReply(helpText?: string) {
  return [
    "## Mình đang lắng nghe bạn",
    "Điều bạn vừa chia sẻ rất nặng nề, và mình rất trân trọng việc bạn nói ra. Bạn không phải đối mặt một mình.",
    "",
    "Nếu bạn đang có ý nghĩ làm hại bản thân hoặc người khác, hoặc đang ở trong tình huống nguy hiểm, hãy liên hệ ngay người thân tin cậy, cơ sở y tế gần nhất hoặc đường dây hỗ trợ khẩn cấp tại nơi bạn sống.",
    helpText ? `\n${helpText}` : "",
    "",
    "Mình là công cụ hỗ trợ, không thay thế được chuyên gia. Khi bạn đã an toàn hơn, mình rất sẵn lòng cùng bạn nhìn lại mọi chuyện.",
  ].join("\n");
}
