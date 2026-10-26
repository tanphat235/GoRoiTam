export const TOPICS = {
  gia_dinh: "Gia đình",
  tinh_yeu: "Tình yêu",
  cong_viec: "Công việc",
  lo_au: "Lo âu",
  san_gian: "Sân giận",
  tu_tap: "Tu tập",
  khac: "Khác",
} as const;

export const KINDS = {
  question: { label: "Câu hỏi", tab: "questions" },
  share: { label: "Chia sẻ", tab: "shares" },
  learn: { label: "Học hỏi", tab: "learning" },
} as const;

export type Topic = keyof typeof TOPICS;
export type Kind = keyof typeof KINDS;
