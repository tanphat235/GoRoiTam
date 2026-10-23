# Gỡ Rối Tâm

Hỏi · Hiểu · An Lạc. Web app: AI trả lời theo giáo lý Phật giáo Đại thừa, cộng đồng chia sẻ (có ẩn danh), lịch tu tập và nhật ký tâm.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL + Drizzle ORM · đăng nhập tự xây (scrypt, session trong DB) · nodemailer (SMTP). Không phụ thuộc dịch vụ trả phí.

## Chạy local

```bash
npm install
cp .env.example .env.local      # rồi chỉnh các giá trị (xem bên dưới)
npm run db:migrate              # tạo bảng + dữ liệu mẫu
npm run dev                     # http://localhost:3000
```

### Database
- **Chưa cài PostgreSQL?** Giữ `DATABASE_URL=pglite:./.data/pg`. Đây là PostgreSQL thật chạy nhúng (PGlite), dữ liệu lưu trong thư mục `.data/` (đã gitignore). Chỉ dùng cho máy cá nhân, một tiến trình.
- **PostgreSQL thật (production):** `DATABASE_URL=postgres://user:password@host:5432/goroitam` rồi `npm run db:migrate`.
- Đổi schema: sửa `src/server/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`.

### Email
- Development: nếu `SMTP_HOST` để trống, email (xác nhận tài khoản, đặt lại mật khẩu) được **in ra terminal** kèm liên kết.
- Production: bắt buộc cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. Thiếu SMTP thì việc gửi email báo lỗi, không âm thầm bỏ qua.
- Đặt `NEXT_PUBLIC_SITE_URL` đúng địa chỉ app để liên kết trong email trỏ đúng chỗ.

### Tài khoản quản trị
Thêm email vào `ADMIN_EMAILS` (cách nhau bằng dấu phẩy). Tài khoản đó thành admin khi xác nhận email hoặc khi đăng nhập. Không cần sửa database thủ công.

### AI
| `LLM_PROVIDER` | Dùng khi |
|---|---|
| `mock` (mặc định) | Chưa có model; trả lời mẫu đúng cấu trúc |
| `openai-compatible` | Endpoint `POST {LLM_BASE_URL}/chat/completions`, ví dụ Ollama local `http://localhost:11434/v1`. Đặt `LLM_MODEL`, `LLM_API_KEY` nếu cần |

## Luồng người dùng
Đăng ký → email xác nhận → bấm liên kết (`/xac-nhan-email`) → chọn biệt danh → dùng app.
Quên mật khẩu → email → `/dat-lai-mat-khau` → mật khẩu mới (đăng xuất mọi thiết bị khác).

## Bảo mật đã có
- Mật khẩu băm scrypt (N=2^17); so sánh thời gian hằng; đăng nhập email không tồn tại tốn cùng thời gian.
- Session: token ngẫu nhiên 256-bit trong cookie httpOnly/SameSite=Lax, DB chỉ lưu SHA-256 của token. Đổi/đặt lại mật khẩu hoặc bị khóa → thu hồi mọi session.
- Token email dùng một lần, có hạn (xác nhận 24h, đặt lại 1h), cấp mới thì vô hiệu token cũ.
- Đăng ký không tiết lộ email đã tồn tại hay chưa.
- Giới hạn tần suất lưu trong Postgres: đăng ký, đăng nhập, gửi lại email, quên mật khẩu, bình luận.
- Hạn mức (2 câu AI, 2 bài/ngày gói Free) kiểm tra nguyên tử trong một câu UPDATE, không vượt được bằng request song song.
- Bài ẩn danh: truy vấn công khai không bao giờ trả biệt danh/ID tác giả.
- Mọi truy vấn dữ liệu cá nhân lọc theo người dùng hiện tại ở server. API AI chặn POST khác origin. Có CSP và security headers.

## Kiểm thử
```bash
npm test          # unit + tích hợp trên PostgreSQL (PGlite trong bộ nhớ, chạy migration thật)
npm run lint
npm run typecheck
npm run build
```

## Việc cần làm trước khi ra công khai
- Nạp văn bản kinh điển Đại thừa **đã xác minh** vào `teaching_sources` / `teaching_chunks` (`verified = true`). Dữ liệu hiện tại chỉ là tóm tắt khái niệm mẫu.
- Điền `CRISIS_HELP_TEXT` bằng đường dây hỗ trợ đã kiểm chứng.
- Cấu hình SMTP và PostgreSQL production; đặt `NEXT_PUBLIC_SITE_URL`.
- Rà soát pháp lý trang Quyền riêng tư / Điều khoản (đang là bản nháp).

## Cấu trúc
```
drizzle/                 SQL migrations (sinh từ schema) + seed
scripts/migrate.mjs      áp migration cho Postgres hoặc PGlite
src/server/              db, auth (password, session, tokens), mail, quota, rate-limit
src/modules/<feature>/   actions (Server Actions), queries, logic thuần có test
src/app/                 các trang (App Router)
src/components/          UI: shell, scenery (phong cảnh SVG), post-card, ui
```
