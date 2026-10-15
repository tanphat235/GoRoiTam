-- Gỡ Rối Tâm — MVP schema. Run in Supabase SQL editor (or `supabase db push`).
-- All user-facing tables have RLS enabled. Writes that carry business rules go through SECURITY DEFINER functions.

create extension if not exists unaccent with schema extensions;

-- ---------- helpers ----------
create or replace function public.immutable_unaccent(t text)
returns text language sql immutable parallel safe
set search_path = extensions, public
as $$ select extensions.unaccent(t) $$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 3 and 24 and nickname ~ '^[A-Za-z0-9_À-ỹ .-]+$'),
  role text not null default 'user' check (role in ('user','moderator','admin')),
  plan text not null default 'free' check (plan in ('free','premium')),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  banned_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('moderator','admin') and banned_at is null)
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and banned_at is null)
$$;

create policy profiles_select_own on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_insert_own on public.profiles for insert with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- users may only touch these columns; role/plan/banned_at are server-only
revoke insert, update on public.profiles from authenticated, anon;
grant insert (id, nickname, timezone) on public.profiles to authenticated;
grant update (nickname, timezone) on public.profiles to authenticated;

-- ---------- community ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  topic text not null default 'khac',
  is_anonymous boolean not null default false,
  status text not null default 'visible' check (status in ('visible','hidden')),
  created_at timestamptz not null default now()
);
create index posts_feed_idx on public.posts (status, is_anonymous, created_at desc);
alter table public.posts enable row level security;
create policy posts_select_own on public.posts for select using (author_id = auth.uid() or public.is_staff());
create policy posts_delete_own on public.posts for delete using (author_id = auth.uid());
-- no insert/update policy: creation goes through create_post() (quota + duplicate check)

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1500),
  status text not null default 'visible' check (status in ('visible','hidden')),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
alter table public.comments enable row level security;
create policy comments_select_own on public.comments for select using (author_id = auth.uid() or public.is_staff());
-- security definer: the caller cannot SELECT other users' posts directly (RLS), but may comment on visible ones
create or replace function public.post_is_visible(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.posts where id = p_id and status = 'visible')
$$;
create policy comments_insert_own on public.comments for insert
  with check (author_id = auth.uid() and public.is_active_user() and public.post_is_visible(post_id));
create policy comments_delete_own on public.comments for delete using (author_id = auth.uid());

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_reactions enable row level security;
create policy reactions_select_own on public.post_reactions for select using (user_id = auth.uid());
create policy reactions_insert_own on public.post_reactions for insert with check (user_id = auth.uid() and public.is_active_user());
create policy reactions_delete_own on public.post_reactions for delete using (user_id = auth.uid());

create table public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open','dismissed','actioned')),
  created_at timestamptz not null default now(),
  check ((post_id is not null) <> (comment_id is not null)),
  unique nulls not distinct (post_id, comment_id, reporter_id)
);
alter table public.post_reports enable row level security;
create policy reports_insert_own on public.post_reports for insert with check (reporter_id = auth.uid() and public.is_active_user());
create policy reports_select_staff on public.post_reports for select using (public.is_staff());

-- 3 distinct reporters hide the post/comment until a moderator reviews it
create or replace function public.auto_hide_reported() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.post_id is not null and
     (select count(*) from public.post_reports where post_id = new.post_id and status = 'open') >= 3 then
    update public.posts set status = 'hidden' where id = new.post_id;
  elsif new.comment_id is not null and
     (select count(*) from public.post_reports where comment_id = new.comment_id and status = 'open') >= 3 then
    update public.comments set status = 'hidden' where id = new.comment_id;
  end if;
  return new;
end $$;
create trigger post_reports_auto_hide after insert on public.post_reports
  for each row execute function public.auto_hide_reported();

-- Public read models. Owned by the migration role, so they bypass RLS on purpose and
-- expose ONLY safe columns: anonymous posts never show author_id or nickname.
create view public.public_posts as
select p.id, p.body, p.topic, p.is_anonymous, p.created_at,
       case when p.is_anonymous then null else p.author_id end as author_id,
       case when p.is_anonymous then null else pr.nickname end as nickname,
       (select count(*) from public.post_reactions r where r.post_id = p.id) as reaction_count,
       (select count(*) from public.comments c where c.post_id = p.id and c.status = 'visible') as comment_count
from public.posts p join public.profiles pr on pr.id = p.author_id
where p.status = 'visible' and pr.banned_at is null;

create view public.public_comments as
select c.id, c.post_id, c.body, c.created_at, c.author_id, pr.nickname
from public.comments c join public.profiles pr on pr.id = c.author_id
join public.posts p on p.id = c.post_id
where c.status = 'visible' and p.status = 'visible' and pr.banned_at is null;

grant select on public.public_posts, public.public_comments to anon, authenticated;

-- ---------- quota ----------
create table public.usage_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  ai_count int not null default 0,
  post_count int not null default 0,
  primary key (user_id, day)
);
alter table public.usage_daily enable row level security;
create policy usage_select_own on public.usage_daily for select using (user_id = auth.uid());

create table public.guest_usage (
  guest_key_hash text not null,
  day date not null,
  ai_count int not null default 0,
  primary key (guest_key_hash, day)
);
alter table public.guest_usage enable row level security; -- no policies: service role only

create or replace function public.quota_limit(p_plan text, p_kind text) returns int
language sql immutable as $$
  select case when p_plan = 'premium' then (case p_kind when 'ai' then 30 else 10 end)
              else (case p_kind when 'ai' then 2 else 2 end) end
$$;

-- Atomic: increments only if under the limit. Returns true when allowed.
create or replace function public.consume_quota(p_kind text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_plan text;
  v_limit int;
  v_day date := (now() at time zone 'utc')::date;
  v_rows int;
begin
  if v_user is null or p_kind not in ('ai','post') then return false; end if;
  select plan into v_plan from public.profiles where id = v_user and banned_at is null;
  if v_plan is null then return false; end if;
  v_limit := public.quota_limit(v_plan, p_kind);
  insert into public.usage_daily (user_id, day) values (v_user, v_day) on conflict do nothing;
  if p_kind = 'ai' then
    update public.usage_daily set ai_count = ai_count + 1 where user_id = v_user and day = v_day and ai_count < v_limit;
  else
    update public.usage_daily set post_count = post_count + 1 where user_id = v_user and day = v_day and post_count < v_limit;
  end if;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end $$;

create or replace function public.refund_quota(p_user uuid, p_kind text) returns void
language sql security definer set search_path = public as $$
  update public.usage_daily
     set ai_count = greatest(ai_count - (case when p_kind = 'ai' then 1 else 0 end), 0),
         post_count = greatest(post_count - (case when p_kind = 'post' then 1 else 0 end), 0)
   where user_id = p_user and day = (now() at time zone 'utc')::date
$$;

create or replace function public.consume_guest_quota(p_key text, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_day date := (now() at time zone 'utc')::date; v_rows int;
begin
  insert into public.guest_usage (guest_key_hash, day) values (p_key, v_day) on conflict do nothing;
  update public.guest_usage set ai_count = ai_count + 1
   where guest_key_hash = p_key and day = v_day and ai_count < p_limit;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end $$;

revoke all on function public.refund_quota(uuid, text) from public, anon, authenticated;
revoke all on function public.consume_guest_quota(text, int) from public, anon, authenticated;
grant execute on function public.refund_quota(uuid, text) to service_role;
grant execute on function public.consume_guest_quota(text, int) to service_role;
revoke all on function public.consume_quota(text) from public, anon;
grant execute on function public.consume_quota(text) to authenticated;

-- Post creation: quota + duplicate check + ban check in one place.
create or replace function public.create_post(p_body text, p_topic text, p_anonymous boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null or not public.is_active_user() then raise exception 'not_allowed'; end if;
  if exists (select 1 from public.posts where author_id = v_user and body = p_body and created_at > now() - interval '1 day') then
    raise exception 'duplicate';
  end if;
  if not public.consume_quota('post') then raise exception 'quota_exceeded'; end if;
  insert into public.posts (author_id, body, topic, is_anonymous)
  values (v_user, p_body, coalesce(nullif(p_topic, ''), 'khac'), coalesce(p_anonymous, false))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_post(text, text, boolean) from public, anon;
grant execute on function public.create_post(text, text, boolean) to authenticated;

-- ---------- AI ----------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Cuộc trò chuyện mới',
  created_at timestamptz not null default now()
);
alter table public.ai_conversations enable row level security;
create policy conv_all_own on public.ai_conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  sources jsonb not null default '[]',
  flags jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index ai_messages_conv_idx on public.ai_messages (conversation_id, created_at);
alter table public.ai_messages enable row level security;
create policy msg_all_own on public.ai_messages for all
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

create table public.teaching_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tradition text not null default 'dai-thua',
  translator text,
  notes text,
  verified boolean not null default false
);
create table public.teaching_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.teaching_sources(id) on delete cascade,
  locator text,
  text text not null,
  tsv tsvector
);
create index teaching_chunks_tsv_idx on public.teaching_chunks using gin (tsv);
create or replace function public.teaching_chunks_tsv() returns trigger language plpgsql as $$
begin new.tsv := to_tsvector('simple', public.immutable_unaccent(lower(new.text))); return new; end $$;
create trigger teaching_chunks_tsv_trg before insert or update of text on public.teaching_chunks
  for each row execute function public.teaching_chunks_tsv();
alter table public.teaching_sources enable row level security;
alter table public.teaching_chunks enable row level security;
create policy sources_read on public.teaching_sources for select using (true);
create policy chunks_read on public.teaching_chunks for select using (true);

-- OR-match over accent-stripped words; returns best chunks with their source title.
create or replace function public.search_teachings(q text, k int default 4)
returns table (id uuid, source_title text, locator text, text text, verified boolean, rank real)
language plpgsql stable set search_path = public as $$
declare v_tokens text[]; v_query tsquery;
begin
  select array_agg(distinct w) into v_tokens from (
    select w from regexp_split_to_table(lower(public.immutable_unaccent(q)), '[^a-z0-9]+') as w
    where char_length(w) > 2 limit 16) t;
  if v_tokens is null then return; end if;
  v_query := to_tsquery('simple', array_to_string(v_tokens, ' | '));
  return query
    select c.id, s.title, c.locator, c.text, s.verified, ts_rank(c.tsv, v_query) as rank
    from public.teaching_chunks c join public.teaching_sources s on s.id = c.source_id
    where c.tsv @@ v_query
    order by rank desc limit least(k, 8);
end $$;
grant execute on function public.search_teachings(text, int) to anon, authenticated, service_role;

-- ---------- practice ----------
create table public.practice_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  items jsonb not null
);
alter table public.practice_templates enable row level security;
create policy templates_read on public.practice_templates for select using (true);

create table public.practice_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  items jsonb not null default '[]', -- [{key,time,label}]
  created_at timestamptz not null default now()
);
alter table public.practice_schedules enable row level security;
create policy sched_all_own on public.practice_schedules for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  schedule_id uuid not null references public.practice_schedules(id) on delete cascade,
  day date not null,
  item_key text not null,
  done_at timestamptz not null default now(),
  unique (user_id, schedule_id, day, item_key)
);
alter table public.practice_logs enable row level security;
create policy logs_all_own on public.practice_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mood smallint not null check (mood between 1 and 5),
  text text not null check (char_length(text) between 1 and 3000),
  created_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;
create policy journal_all_own on public.journal_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- audit ----------
create table public.audit_log (
  id bigserial primary key,
  actor uuid,
  action text not null,
  target text,
  at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy audit_select_staff on public.audit_log for select using (public.is_staff());
-- inserts: service role only

-- ---------- seed ----------
insert into public.practice_templates (name, description, items) values
 ('Buổi sáng nhẹ nhàng', 'Bắt đầu ngày bằng thiền ngắn và một lời nguyện.',
  '[{"key":"a","time":"06:00","label":"Thiền theo hơi thở 10 phút"},{"key":"b","time":"06:15","label":"Phát nguyện một việc thiện hôm nay"}]'),
 ('Niệm Phật buổi tối', 'Kết thúc ngày bằng niệm Phật và nhìn lại.',
  '[{"key":"a","time":"20:30","label":"Niệm Phật 15 phút"},{"key":"b","time":"21:00","label":"Nhìn lại ngày: một điều đã nhận ra"}]'),
 ('Đọc kinh và học giáo lý', 'Mỗi ngày một đoạn nhỏ, đọc chậm và suy ngẫm.',
  '[{"key":"a","time":"19:30","label":"Đọc một đoạn kinh (5-10 phút)"},{"key":"b","time":"19:45","label":"Ghi một câu mình hiểu"}]');

-- SAMPLE corpus: short concept summaries written for the app, NOT scripture quotations.
-- Replace/extend with verified texts (set verified = true) before launch.
with s as (
  insert into public.teaching_sources (title, tradition, notes, verified)
  values ('Tóm tắt khái niệm Phật pháp (mẫu — chưa phải trích dẫn kinh)', 'dai-thua',
          'Nội dung mẫu để thử hệ thống. Cần thay bằng văn bản kinh điển đã xác minh.', false)
  returning id)
insert into public.teaching_chunks (source_id, locator, text)
select s.id, v.locator, v.text from s, (values
 ('Tứ Diệu Đế', 'Khổ đau có thật và có nguyên nhân. Nhận ra khổ, tìm nguyên nhân của nó (thường là tham muốn và chấp giữ), tin rằng khổ có thể chấm dứt, và đi theo con đường thực hành cụ thể để chuyển hóa.'),
 ('Bát Chánh Đạo', 'Con đường thực hành gồm cách nhìn đúng, suy nghĩ đúng, lời nói đúng, hành động đúng, nghề nghiệp đúng, nỗ lực đúng, chánh niệm và thiền định đúng. Bắt đầu từ một việc nhỏ trong đời sống hằng ngày.'),
 ('Vô thường', 'Mọi hoàn cảnh, cảm xúc và mối quan hệ đều thay đổi. Khi thấy rõ vô thường, ta bớt bám víu vào cảm xúc đang có và mở ra khả năng chuyển hóa.'),
 ('Duyên khởi', 'Sự việc sinh ra từ nhiều nguyên nhân và điều kiện, không phải do một lỗi duy nhất. Nhìn theo duyên khởi giúp bớt tự trách và bớt đổ lỗi, đồng thời thấy mình có thể thay đổi một số điều kiện.'),
 ('Tham sân si', 'Ba gốc rễ của nhiều phiền não: tham (muốn mãi), sân (giận dữ, ghét bỏ), si (hiểu sai thực tại). Khi giận, hãy nhận diện cơn giận, thở chậm, chưa vội nói hay làm.'),
 ('Từ bi', 'Từ là mong người khác được an vui, bi là mong người khác bớt khổ. Từ bi bắt đầu từ việc đối xử tử tế với chính mình, rồi lan ra người thân, người khó chịu và mọi người. Từ bi không có nghĩa là chịu đựng bạo lực.'),
 ('Chánh niệm', 'Chú ý có chủ đích đến hơi thở, thân và cảm xúc ở hiện tại mà không phán xét. Thực hành ngắn mỗi ngày giúp thấy rõ phản ứng của mình trước khi hành động.'),
 ('Buông bỏ và chấp trước', 'Chấp trước là bám vào kỳ vọng rằng người hoặc việc phải như ý mình. Buông bỏ không phải là bỏ mặc, mà là làm phần mình có thể làm rồi chấp nhận phần ngoài khả năng kiểm soát.')
) as v(locator, text);
