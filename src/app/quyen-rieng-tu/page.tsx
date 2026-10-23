import { PageHeader } from "@/components/ui";

export const metadata = { title: "Quyền riêng tư" };

export default function Page() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed">
      <PageHeader title="Quyền riêng tư" sub="Bản nháp cho giai đoạn beta — cần rà soát pháp lý trước khi ra công khai." />
      <h2 className="font-serif text-lg font-semibold">Dữ liệu chúng tôi lưu</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Email, mật khẩu (chỉ lưu dạng băm một chiều, không ai đọc được), biệt danh, múi giờ.</li>
        <li>Bài viết, bình luận, lượt đồng cảm, lịch tu tập, nhật ký và các cuộc trò chuyện AI của bạn.</li>
        <li>Số lượt dùng mỗi ngày để áp dụng giới hạn miễn phí. Khách chưa đăng ký chỉ lưu mã băm một chiều để giới hạn lượt thử.</li>
      </ul>
      <h2 className="font-serif text-lg font-semibold">Ẩn danh</h2>
      <p>Bài đăng ẩn danh không hiển thị tên, biệt danh hay email cho thành viên khác. Tuy nhiên hệ thống vẫn liên kết bài với tài khoản để chống spam và xử lý vi phạm; chỉ người quản trị có thể truy cập thông tin này. Chúng tôi không hứa ẩn danh tuyệt đối.</p>
      <h2 className="font-serif text-lg font-semibold">Cuộc trò chuyện AI</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Riêng tư theo mặc định, không hiển thị công khai và không dùng để huấn luyện mô hình.</li>
        <li>Nội dung câu hỏi được gửi tới nhà cung cấp mô hình AI đang cấu hình để tạo câu trả lời. Email và thông tin tài khoản không được gửi.</li>
      </ul>
      <h2 className="font-serif text-lg font-semibold">Quyền của bạn</h2>
      <p>Bạn có thể xóa tài khoản và toàn bộ dữ liệu bất cứ lúc nào tại trang Hồ sơ.</p>
    </article>
  );
}
