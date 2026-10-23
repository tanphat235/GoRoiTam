import { PageHeader } from "@/components/ui";

export const metadata = { title: "Điều khoản" };

export default function Page() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed">
      <PageHeader title="Điều khoản sử dụng" sub="Bản nháp cho giai đoạn beta — cần rà soát pháp lý trước khi ra công khai." />
      <ul className="list-disc space-y-2 pl-5">
        <li>Gỡ Rối Tâm là công cụ hỗ trợ tinh thần theo góc nhìn Phật giáo, không phải dịch vụ y tế, tâm lý hay pháp lý.</li>
        <li>AI có thể sai hoặc diễn giải chưa đầy đủ. Hãy tham khảo thầy hoặc chuyên gia khi cần.</li>
        <li>Nếu bạn đang có nguy cơ làm hại bản thân hoặc người khác, hãy liên hệ ngay người thân, cơ sở y tế hoặc đường dây hỗ trợ khẩn cấp.</li>
        <li>Không đăng nội dung xúc phạm, quấy rối, spam, kích động bạo lực hay tranh luận gây chia rẽ tôn giáo. Nội dung vi phạm có thể bị ẩn và tài khoản có thể bị khóa.</li>
        <li>Bản miễn phí có giới hạn số bài đăng và lượt hỏi AI mỗi ngày. Giới hạn có thể thay đổi.</li>
      </ul>
    </article>
  );
}
