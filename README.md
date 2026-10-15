# Gỡ Rối Tâm

Web app: cộng đồng chia sẻ (có ẩn danh) + AI trả lời theo giáo lý Phật giáo Đại thừa + lịch tu tập.
Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres, Auth, RLS). Không dùng dịch vụ trả phí.

## Chạy local

1. `npm install`
2. Tạo project Supabase (Free). Vào **SQL Editor**, chạy toàn bộ `supabase/migrations/0001_schema.sql`.
3. Auth → Providers → Email: bật. Để thử nhanh, có thể tắt "Confirm email".
4. `cp .env.example .env.local` rồi điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API) và `GUEST_HASH_SALT` (chuỗi ngẫu nhiên).
5. `npm run dev` → http://localhost:3000

`SUPABASE_SERVICE_ROLE_KEY` chỉ dùng phía server, không bao giờ đặt tiền tố `NEXT_PUBLIC_`.

## AI provider (đổi được bằng env)

| `LLM_PROVIDER` | Dùng khi |
|---|---|
| `mock` (mặc định) | Phát triển, không cần key |
| `openai-compatible` | Bất kỳ endpoint `POST {LLM_BASE_URL}/chat/completions`: Ollama local (`http://localhost:11434/v1`) hoặc dịch vụ có free tier. Đặt `LLM_MODEL`, `LLM_API_KEY` (nếu cần) |

Thêm provider mới: implement `LLMProvider` trong `src/lib/llm/types.ts`, đăng ký ở `src/lib/llm/index.ts`.
Kiểm tra giới hạn free tier trong tài liệu chính thức của nhà cung cấp bạn chọn.

## Tạo admin

Đăng ký tài khoản, chọn biệt danh, rồi trong SQL Editor:
`update public.profiles set role = 'admin' where nickname = '<biệt danh>';`

## Việc bạn cần làm trước khi ra công khai

- Nạp văn bản kinh điển Đại thừa **đã xác minh** vào `teaching_sources` / `teaching_chunks` (đặt `verified = true`). Dữ liệu seed hiện chỉ là tóm tắt khái niệm mẫu, không phải trích dẫn kinh.
- Điền `CRISIS_HELP_TEXT` bằng đường dây hỗ trợ bạn đã kiểm chứng.
- Rà soát pháp lý trang Quyền riêng tư / Điều khoản (đang là bản nháp).
- Đặt `LLM_PROVIDER` thật và kiểm thử chất lượng trả lời tiếng Việt.

## Kiến trúc

- `src/modules/{auth,community,ai,practice,admin}`: nghiệp vụ theo module (actions, logic thuần có test).
- Quota (2 AI + 2 bài/ngày gói Free) kiểm tra nguyên tử trong Postgres (`consume_quota`, `create_post`); khách dùng `consume_guest_quota` (khóa theo cookie và IP đã băm).
- Bài ẩn danh đọc qua view `public_posts` không trả `author_id`/biệt danh.
- Trích dẫn nguồn do server dựng từ đoạn tài liệu đã truy xuất, không lấy từ model.

## Lệnh

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`
