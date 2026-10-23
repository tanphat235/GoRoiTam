import { normalize } from "./guard";

/**
 * Scope gate that runs BEFORE the LLM, with no model call: Gỡ Rối Tâm only answers questions about
 * life (feelings, relationships, family, work stress, loss…) and Buddhist practice. Anything else gets
 * a fixed reply, costs no tokens and no quota. Matching is accent-insensitive on whole words.
 */

// Life, emotions, relationships and practice. Written without accents (matched after normalize()).
// Avoid short words that become ambiguous without accents (chùa/chưa, tâm/tám, sống/sông, vợ/vở,
// Phật/phát, yêu/yếu): use them only inside phrases, otherwise off-topic questions slip through.
const LIFE = [
  // feelings
  "buon", "lo au", "lo lang", "lo so", "so hai", "bat an", "hoang mang", "tuc gian", "noi gian", "gian du", "gian doi", "san han", "chan nan",
  "met moi", "ap luc", "stress", "cang thang", "co don", "tu ti", "mac cam", "ton thuong", "dau kho", "kho so", "noi kho",
  "kho khan", "kho chiu", "hoi han", "ghen", "ganh ti", "do ky", "that vong", "tuyet vong", "mat ngu", "khoc", "so hai",
  "xau ho", "tha thu", "oan han", "han thu", "thu han", "ghet", "trong rong", "vo dinh", "hanh phuc", "binh an", "an lac",
  "binh tinh", "binh tam", "cam xuc", "suy nghi", "tam trang", "tam ly", "tram cam", "chan doi", "chan song",
  // relationships & life events
  "tinh yeu", "yeu duong", "yeu nhau", "yeu don phuong", "that tinh", "chia tay", "ly hon", "ngoai tinh", "phan boi",
  "vo chong", "vo toi", "vo minh", "nguoi vo", "chong toi", "chong minh", "nguoi chong", "nguoi yeu", "ban trai", "ban gai",
  "gia dinh", "bo me", "cha me", "me chong", "me vo", "bo chong", "con cai", "con toi", "con minh", "anh chi em", "ban be",
  "dong nghiep", "sep", "cap tren", "cong viec", "mat viec", "that nghiep", "nghi viec", "ap luc hoc", "thi truot", "no nan",
  "tien bac", "benh tat", "om dau", "qua doi", "mat mat", "cai chet", "tuoi gia", "mau thuan", "cai nhau", "tranh cai",
  "quan he", "doi xu", "ky vong", "tu trach", "do loi", "lam lai", "bat dau lai", "cuoc song", "song tot", "loi song",
  "song the nao", "song sao", "cuoc doi", "y nghia", "ban than", "tam hon", "tam tri", "tam su", "binh tam", "an tam",
  "tam an", "trong long", "nhe long", "chap nhan", "co chap",
  // Buddhist practice
  "duc phat", "phat phap", "dao phat", "niem phat", "lay phat", "giao ly", "doc kinh", "tung kinh", "kinh phat",
  "thien dinh", "ngoi thien", "tap thien", "hanh thien", "tu tap", "tu hanh", "di chua", "len chua", "su thay",
  "nghiep", "nhan qua", "luan hoi", "vo thuong", "buong bo", "chap niem", "chap truoc", "chanh niem", "tu bi", "tri tue",
  "giu gioi", "sam hoi", "cong duc", "phuoc", "an nhien", "tinh do", "bo tat", "quan am", "a di da", "tham san si",
];

// Clearly outside the app's purpose.
const OFF = [
  "code", "coding", "lap trinh", "python", "javascript", "typescript", "java", "html", "css", "sql", "react", "nextjs",
  "api", "bug", "debug", "compile", "thuat toan", "algorithm", "regex", "git", "docker", "server", "database", "excel",
  "phuong trinh", "dao ham", "tich phan", "ma tran", "bai tap", "de thi", "dap an", "homework", "chung minh rang",
  "dich sang", "translate", "dich giup", "bai van", "bai luan", "essay", "soan van", "viet email", "cv", "thu xin viec",
  "gia vang", "ty gia", "bitcoin", "crypto", "co phieu", "chung khoan", "xo so", "keo bong da", "ty so", "bong da",
  "thoi tiet", "cong thuc nau", "nau mon", "mua o dau", "review", "dien thoai", "laptop", "iphone", "android",
  "phan mem", "cai dat", "thu do", "dan so", "bao nhieu km", "ai la nguoi", "chinh tri", "bau cu",
];

// Attempts to re-purpose the assistant. Always refused, even if life words are present.
const INJECTION = [
  "ignore previous", "ignore all", "bo qua huong dan", "bo qua tat ca", "system prompt", "jailbreak", "you are now",
  "act as", "dong vai", "gia vo la", "developer mode", "prompt cua ban", "huong dan cua ban",
];

const GREETING = /^(xin chao|chao( ban| ad| admin)?|hello|hi|hey|alo)[\s!.,?]*$/;

const toRegex = (words: string[]) => new RegExp(`\\b(?:${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
const LIFE_RE = toRegex(LIFE);
const OFF_RE = toRegex(OFF);
const INJECTION_RE = toRegex(INJECTION);
const MATH_RE = /\d+\s*[-+*/x×÷^=]\s*\d+/;

export type TopicVerdict =
  | { allowed: true }
  | { allowed: false; reason: "off_topic" | "injection" | "unclear" | "greeting"; reply: string };

export const REPLIES = {
  off_topic:
    "Gỡ Rối Tâm chỉ đồng hành cùng bạn trong những vấn đề của cuộc sống: cảm xúc, các mối quan hệ, gia đình, công việc, mất mát, và việc tu tập theo Phật pháp. Câu hỏi này nằm ngoài phạm vi đó nên mình xin phép không trả lời.\n\nNếu bạn đang có điều gì trăn trở, hãy kể cho mình nghe nhé.",
  injection:
    "Mình chỉ có thể đồng hành cùng bạn trong những vấn đề của cuộc sống và việc tu tập. Nếu bạn đang có điều gì trăn trở, hãy kể cho mình nghe nhé.",
  unclear:
    "Mình chưa rõ bạn đang gặp chuyện gì. Bạn có thể kể thêm về điều đang làm bạn bận lòng không? Ví dụ: chuyện gia đình, công việc, một mối quan hệ, hay một cảm xúc khó chịu mà bạn đang mang.",
  greeting:
    "Chào bạn. Mình là Gỡ Rối Tâm, ở đây để lắng nghe. Hôm nay có điều gì làm bạn bận lòng không?",
} as const;

const count = (re: RegExp, text: string) => (text.match(re) ?? []).length;

/**
 * @param continuing true when the message is a follow-up inside an existing conversation; short
 * neutral follow-ups ("vậy mình nên làm gì?") are then allowed instead of asking for more detail.
 */
export function classifyTopic(message: string, continuing = false): TopicVerdict {
  const n = normalize(message).replace(/\s+/g, " ").trim();
  if (count(INJECTION_RE, n) > 0) return { allowed: false, reason: "injection", reply: REPLIES.injection };
  if (GREETING.test(n)) return { allowed: false, reason: "greeting", reply: REPLIES.greeting };

  const life = count(LIFE_RE, n);
  const off = count(OFF_RE, n) + (MATH_RE.test(n) ? 1 : 0);
  if (off > 0 && life < off) return { allowed: false, reason: "off_topic", reply: REPLIES.off_topic };
  if (life > 0) return { allowed: true };
  if (continuing) return { allowed: true };
  return { allowed: false, reason: "unclear", reply: REPLIES.unclear };
}
