-- ============================================================
-- Classly — Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null default 'teacher', -- 'teacher' | 'student'
  created_at  timestamptz default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. SPACES (a teacher's classroom)
create table public.spaces (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  subject     text,
  join_code   text not null unique,
  created_at  timestamptz default now()
);

-- Auto-set teacher_id to the logged-in user
create or replace function public.set_teacher_id()
returns trigger as $$
begin
  new.teacher_id = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

create trigger spaces_set_teacher_id
  before insert on public.spaces
  for each row execute procedure public.set_teacher_id();


-- 3. ENROLLMENTS (student joins a space)
create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz default now(),
  unique(space_id, student_id)
);


-- 4. CONTENT (notes, quizzes, assignments)
create table public.content (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces(id) on delete cascade,
  type        text not null check (type in ('note', 'quiz', 'assignment')),
  title       text not null,
  body        text,
  settings    jsonb default '{}',
  due_at      timestamptz,
  created_at  timestamptz default now()
);


-- 5. QUIZ QUESTIONS
create table public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  content_id     uuid not null references public.content(id) on delete cascade,
  question       text not null,
  options        jsonb not null default '[]',  -- array of option strings
  correct_answer text not null,
  order_index    int not null default 0
);


-- 6. SUBMISSIONS (student submits a quiz or assignment)
create table public.submissions (
  id           uuid primary key default gen_random_uuid(),
  content_id   uuid not null references public.content(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'submitted', -- 'submitted' | 'graded'
  score        int,    -- percentage 0-100
  body         text,   -- written submission for assignments
  submitted_at timestamptz default now(),
  unique(content_id, student_id)
);


-- 7. QUIZ ANSWERS (individual question answers inside a submission)
create table public.quiz_answers (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_id   uuid not null references public.quiz_questions(id) on delete cascade,
  answer        text not null,
  is_correct    boolean not null default false
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This controls who can read/write each table
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.spaces         enable row level security;
alter table public.enrollments    enable row level security;
alter table public.content        enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.submissions    enable row level security;
alter table public.quiz_answers   enable row level security;

-- PROFILES: users can read all profiles, only edit their own
create policy "profiles: read all"   on public.profiles for select using (true);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

-- SPACES: teachers can CRUD their own spaces; enrolled students can read
create policy "spaces: teacher full access" on public.spaces for all
  using (teacher_id = auth.uid());

create policy "spaces: enrolled students can read" on public.spaces for select
  using (
    exists (
      select 1 from public.enrollments
      where space_id = spaces.id and student_id = auth.uid()
    )
  );

-- ENROLLMENTS: teachers see their space enrollments; students see their own
create policy "enrollments: teacher read" on public.enrollments for select
  using (
    exists (select 1 from public.spaces where id = space_id and teacher_id = auth.uid())
  );

create policy "enrollments: student insert (join)" on public.enrollments for insert
  with check (student_id = auth.uid());

create policy "enrollments: student read own" on public.enrollments for select
  using (student_id = auth.uid());

-- CONTENT: teachers CRUD in their spaces; enrolled students can read
create policy "content: teacher full access" on public.content for all
  using (
    exists (select 1 from public.spaces where id = space_id and teacher_id = auth.uid())
  );

create policy "content: enrolled students read" on public.content for select
  using (
    exists (
      select 1 from public.enrollments e
      join public.spaces s on s.id = e.space_id
      where s.id = space_id and e.student_id = auth.uid()
    )
  );

-- QUIZ QUESTIONS: same rules as content
create policy "quiz_questions: teacher full access" on public.quiz_questions for all
  using (
    exists (
      select 1 from public.content c
      join public.spaces s on s.id = c.space_id
      where c.id = content_id and s.teacher_id = auth.uid()
    )
  );

create policy "quiz_questions: enrolled students read" on public.quiz_questions for select
  using (
    exists (
      select 1 from public.content c
      join public.enrollments e on e.space_id = c.space_id
      where c.id = content_id and e.student_id = auth.uid()
    )
  );

-- SUBMISSIONS: students manage their own; teachers read all in their spaces
create policy "submissions: student manage own" on public.submissions for all
  using (student_id = auth.uid());

create policy "submissions: teacher read" on public.submissions for select
  using (
    exists (
      select 1 from public.content c
      join public.spaces s on s.id = c.space_id
      where c.id = content_id and s.teacher_id = auth.uid()
    )
  );

-- QUIZ ANSWERS: same as submissions
create policy "quiz_answers: student manage own" on public.quiz_answers for all
  using (
    exists (
      select 1 from public.submissions sub
      where sub.id = submission_id and sub.student_id = auth.uid()
    )
  );

create policy "quiz_answers: teacher read" on public.quiz_answers for select
  using (
    exists (
      select 1 from public.submissions sub
      join public.content c on c.id = sub.content_id
      join public.spaces s on s.id = c.space_id
      where sub.id = submission_id and s.teacher_id = auth.uid()
    )
  );
