import type { LLMProvider } from "./types";

/** Deterministic offline provider for development and tests. Echoes the structure the real model must follow. */
export const mockProvider: LLMProvider = {
  name: "mock",
  async chat(messages) {
    const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const hasSource = messages.some((m) => m.role === "system" && m.content.includes("[1]"));
    return [
      "## Thấu hiểu",
      `Mình nghe thấy bạn đang trải qua một điều không dễ: "${last.slice(0, 120)}". Cảm xúc của bạn là có lý, và bạn không có lỗi khi cảm thấy như vậy.`,
      "",
      "## Góc nhìn Phật pháp",
      `Mọi hoàn cảnh đều do nhiều điều kiện tạo nên và đều thay đổi${hasSource ? " [1]" : ""}. Khi nhìn rõ điều đó, ta bớt tự trách và có thể chọn một việc nhỏ để thay đổi. (Đây là phản hồi thử nghiệm của chế độ mock.)`,
      "",
      "## Thực hành",
      "1. Dành 5 phút thở chậm, chỉ để ý hơi thở vào và ra.",
      "2. Viết ra một việc nhỏ trong tầm tay mà bạn có thể làm hôm nay.",
    ].join("\n");
  },
};
