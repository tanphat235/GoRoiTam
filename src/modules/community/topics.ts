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
  question: { label: "Câu hỏi", tab: "cau-hoi" },
  share: { label: "Chia sẻ", tab: "chia-se" },
  learn: { label: "Học hỏi", tab: "hoc-hoi" },
} as const;

export type Topic = keyof typeof TOPICS;
export type Kind = keyof typeof KINDS;
