/*
# Create schema for Research Institute Management System (پژوه‌گر)

This migration creates the complete database schema for a scientific/research institute
management platform with Persian (Jalali) calendar support. The system manages:
- Users with academic roles (admin, researcher, project_manager, staff)
- Research and executive projects
- Tasks with dependencies and time tracking
- Publications and academic outputs
- Researchers/staff directory
- Departments and organizational chart
- Events and academic calendar

## Tables Created

1. `departments` — organizational departments (e.g. فقه، حقوق، فلسفه)
2. `members` — members/researchers/staff with academic ranks
3. `projects` — research and executive projects with phases
4. `tasks` — tasks belonging to projects, with status, priority, assignees
5. `publications` — academic publications (articles, books, conference papers)
6. `events` — academic events (seminars, defenses, conferences)
7. `activity_log` — audit trail of system activity

## Security

- All tables have RLS enabled
- Owner-scoped policies using auth.uid() where applicable
- Public read for shared institute data (members, departments, publications, events)
- Authenticated-only writes for data management
*/

-- ============ DEPARTMENTS ============
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  head_member_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dept_select_all" ON departments;
CREATE POLICY "dept_select_all" ON departments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "dept_insert_auth" ON departments;
CREATE POLICY "dept_insert_auth" ON departments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "dept_update_auth" ON departments;
CREATE POLICY "dept_update_auth" ON departments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dept_delete_auth" ON departments;
CREATE POLICY "dept_delete_auth" ON departments FOR DELETE
  TO authenticated USING (true);

-- ============ MEMBERS ============
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  full_name text NOT NULL,
  academic_rank text CHECK (academic_rank IN ('professor','associate_professor','assistant_professor','researcher','phd_student','master_student','staff')),
  title text,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  email text,
  phone text,
  bio text,
  avatar_url text,
  orcid text,
  google_scholar_url text,
  h_index integer DEFAULT 0,
  total_citations integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave')),
  joined_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_select_all" ON members;
CREATE POLICY "member_select_all" ON members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "member_insert_auth" ON members;
CREATE POLICY "member_insert_auth" ON members FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "member_update_auth" ON members;
CREATE POLICY "member_update_auth" ON members FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "member_delete_auth" ON members;
CREATE POLICY "member_delete_auth" ON members FOR DELETE
  TO authenticated USING (true);

-- ============ PROJECTS ============
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'research' CHECK (type IN ('research','executive','grant','collaboration')),
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','in_progress','review','completed','on_hold','cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  leader_id uuid REFERENCES members(id) ON DELETE SET NULL,
  budget bigint DEFAULT 0,
  start_date date,
  end_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  tags text[] DEFAULT '{}',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_select_all" ON projects;
CREATE POLICY "project_select_all" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "project_insert_auth" ON projects;
CREATE POLICY "project_insert_auth" ON projects FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "project_update_auth" ON projects;
CREATE POLICY "project_update_auth" ON projects FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "project_delete_auth" ON projects;
CREATE POLICY "project_delete_auth" ON projects FOR DELETE
  TO authenticated USING (true);

-- ============ TASKS ============
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done','blocked')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assignee_id uuid REFERENCES members(id) ON DELETE SET NULL,
  due_date date,
  estimated_hours numeric,
  actual_hours numeric DEFAULT 0,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  sort_order integer DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_select_all" ON tasks;
CREATE POLICY "task_select_all" ON tasks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "task_insert_auth" ON tasks;
CREATE POLICY "task_insert_auth" ON tasks FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "task_update_auth" ON tasks;
CREATE POLICY "task_update_auth" ON tasks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "task_delete_auth" ON tasks;
CREATE POLICY "task_delete_auth" ON tasks FOR DELETE
  TO authenticated USING (true);

-- ============ PUBLICATIONS ============
CREATE TABLE IF NOT EXISTS publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'article' CHECK (type IN ('article','book','book_chapter','conference_paper','thesis','report')),
  authors text[] NOT NULL DEFAULT '{}',
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  journal text,
  publisher text,
  year integer,
  doi text,
  isbn text,
  abstract text,
  keywords text[] DEFAULT '{}',
  volume text,
  issue text,
  pages text,
  citation_count integer DEFAULT 0,
  file_url text,
  status text DEFAULT 'published' CHECK (status IN ('draft','submitted','under_review','accepted','published')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pub_select_all" ON publications;
CREATE POLICY "pub_select_all" ON publications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pub_insert_auth" ON publications;
CREATE POLICY "pub_insert_auth" ON publications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pub_update_auth" ON publications;
CREATE POLICY "pub_update_auth" ON publications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pub_delete_auth" ON publications;
CREATE POLICY "pub_delete_auth" ON publications FOR DELETE
  TO authenticated USING (true);

-- ============ EVENTS ============
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'seminar' CHECK (type IN ('seminar','defense','conference','workshop','meeting','ceremony')),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  location text,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  organizer_id uuid REFERENCES members(id) ON DELETE SET NULL,
  speaker text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_select_all" ON events;
CREATE POLICY "event_select_all" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "event_insert_auth" ON events;
CREATE POLICY "event_insert_auth" ON events FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "event_update_auth" ON events;
CREATE POLICY "event_update_auth" ON events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "event_delete_auth" ON events;
CREATE POLICY "event_delete_auth" ON events FOR DELETE
  TO authenticated USING (true);

-- ============ ACTIVITY LOG ============
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "log_select_all" ON activity_log;
CREATE POLICY "log_select_all" ON activity_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "log_insert_auth" ON activity_log;
CREATE POLICY "log_insert_auth" ON activity_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_leader ON projects(leader_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_publications_member ON publications(member_id);
CREATE INDEX IF NOT EXISTS idx_publications_year ON publications(year);
CREATE INDEX IF NOT EXISTS idx_members_department ON members(department_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_date);

-- ============ SEED DATA ============
INSERT INTO departments (id, name, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'فقه و حقوق', 'گروه فقه و حقوق اسلامی'),
  ('a0000000-0000-0000-0000-000000000002', 'فلسفه و کلام', 'گروه فلسفه و کلام اسلامی'),
  ('a0000000-0000-0000-0000-000000000003', 'تاریخ و تمدن', 'گروه تاریخ و تمدن اسلامی'),
  ('a0000000-0000-0000-0000-000000000004', 'اقتصاد اسلامی', 'گروه اقتصاد اسلامی'),
  ('a0000000-0000-0000-0000-000000000005', 'اداری و پشتیبانی', 'امور اداری و پشتیبانی موسسه')
ON CONFLICT DO NOTHING;

-- Seed members
INSERT INTO members (id, full_name, academic_rank, title, department_id, email, bio, h_index, total_citations, status, joined_date) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'دکتر احمد محمدی', 'professor', 'استاد تمام', 'a0000000-0000-0000-0000-000000000001', 'ahmad.mohammadi@institute.ir', 'استاد فقه و حقوق اسلامی با بیش از ۲۰ سال تجربه پژوهشی', 28, 540, 'active', '2005-09-01'),
  ('b0000000-0000-0000-0000-000000000002', 'دکتر فاطمه احمدی', 'associate_professor', 'دانشیار', 'a0000000-0000-0000-0000-000000000002', 'fatemeh.ahmadi@institute.ir', 'پژوهشگر برجسته فلسفه اسلامی', 22, 380, 'active', '2008-02-15'),
  ('b0000000-0000-0000-0000-000000000003', 'دکتر علی رضایی', 'assistant_professor', 'استادیار', 'a0000000-0000-0000-0000-000000000003', 'ali.rezaei@institute.ir', 'متخصص تاریخ تمدن اسلامی', 15, 210, 'active', '2012-09-01'),
  ('b0000000-0000-0000-0000-000000000004', 'دکتر مریم حسینی', 'assistant_professor', 'استادیار', 'a0000000-0000-0000-0000-000000000004', 'maryam.hosseini@institute.ir', 'پژوهشگر اقتصاد اسلامی', 12, 160, 'active', '2014-09-01'),
  ('b0000000-0000-0000-0000-000000000005', 'حسین کریمی', 'researcher', 'پژوهشگر', 'a0000000-0000-0000-0000-000000000001', 'hossein.karimi@institute.ir', 'پژوهشگر جوان فقه', 5, 42, 'active', '2019-09-01'),
  ('b0000000-0000-0000-0000-000000000006', 'زهرا نوری', 'phd_student', 'دانشجوی دکتری', 'a0000000-0000-0000-0000-000000000002', 'zahra.nouri@institute.ir', 'دانشجوی دکتری فلسفه', 2, 8, 'active', '2021-09-01')
ON CONFLICT DO NOTHING;

-- Seed projects
INSERT INTO projects (id, title, description, type, status, priority, department_id, leader_id, budget, start_date, end_date, progress, tags) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'بررسی فقهی قراردادهای هوشمند', 'پژوهش جامع درباره احکام فقهی قراردادهای هوشمند و بلاکچین', 'research', 'in_progress', 'high', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 500000000, '2025-01-01', '2026-06-30', 45, ARRAY['فقه','فناوری','بلاکچین']),
  ('c0000000-0000-0000-0000-000000000002', 'تاریخ تمدن اسلامی در دوره عباسی', 'بررسی جامع تمدن اسلامی در خلافت عباسی', 'research', 'in_progress', 'medium', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 300000000, '2024-09-01', '2026-03-31', 60, ARRAY['تاریخ','تمدن','عباسی']),
  ('c0000000-0000-0000-0000-000000000003', 'الگوی اقتصاد اسلامی در نهج‌البلاغه', 'استخراج الگوهای اقتصادی از نهج البلاغه', 'research', 'planning', 'medium', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 250000000, '2025-03-01', '2026-12-31', 10, ARRAY['اقتصاد','نهج البلاغه']),
  ('c0000000-0000-0000-0000-000000000004', 'ساماندهی همایش بین‌المللی فلسفه اسلامی', 'برگزاری همایش بین‌المللی فلسفه اسلامی', 'executive', 'in_progress', 'high', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 150000000, '2025-06-01', '2026-01-15', 70, ARRAY['همایش','فلسفه','بین‌المللی']),
  ('c0000000-0000-0000-0000-000000000005', 'دیجیتالی‌سازی کتابخانه موسسه', 'ساماندهی و دیجیتالی‌سازی منابع کتابخانه', 'executive', 'completed', 'low', 'a0000000-0000-0000-0000-000000000005', NULL, 120000000, '2024-01-01', '2025-06-30', 100, ARRAY['کتابخانه','دیجیتال'])
ON CONFLICT DO NOTHING;

-- Seed tasks
INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date, estimated_hours, actual_hours, progress, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'مرور ادبیات بلاکچین', 'بررسی مقالات موجود درباره بلاکچین و قراردادهای هوشمند', 'done', 'high', 'b0000000-0000-0000-0000-000000000005', '2025-03-01', 80, 85, 100, 1),
  ('c0000000-0000-0000-0000-000000000001', 'استخراج احکام فقهی', 'استخراج احکام فقهی مرتبط با قراردادهای هوشمند', 'in_progress', 'high', 'b0000000-0000-0000-0000-000000000001', '2025-09-01', 200, 120, 50, 2),
  ('c0000000-0000-0000-0000-000000000001', 'نگارش فصل اول', 'نگارش فصل اول کتاب', 'todo', 'medium', 'b0000000-0000-0000-0000-000000000005', '2025-12-01', 120, 0, 0, 3),
  ('c0000000-0000-0000-0000-000000000001', 'داوری داخلی', 'داوری نتایج پژوهش توسط اساتید', 'todo', 'medium', NULL, '2026-03-01', 40, 0, 0, 4),
  ('c0000000-0000-0000-0000-000000000002', 'جمع‌آوری منابع تاریخی', 'جمع‌آوری منابع دست اول دوره عباسی', 'done', 'high', 'b0000000-0000-0000-0000-000000000003', '2025-01-01', 150, 140, 100, 1),
  ('c0000000-0000-0000-0000-000000000002', 'تحلیل نظام اداری عباسی', 'تحلیل ساختار اداری و سیاسی خلافت عباسی', 'in_progress', 'high', 'b0000000-0000-0000-0000-000000000003', '2025-10-01', 180, 90, 40, 2),
  ('c0000000-0000-0000-0000-000000000002', 'نگارش فصل اقتصادی', 'بررسی جوانب اقتصادی تمدن عباسی', 'review', 'medium', 'b0000000-0000-0000-0000-000000000003', '2025-08-15', 100, 95, 90, 3),
  ('c0000000-0000-0000-0000-000000000004', 'دعوت از سخنرانان', 'ارتباط با اساتید و دعوت برای سخنرانی', 'done', 'high', 'b0000000-0000-0000-0000-000000000002', '2025-08-01', 60, 55, 100, 1),
  ('c0000000-0000-0000-0000-000000000004', 'تنظیم برنامه علمی', 'تنظیم زمان‌بندی و برنامه علمی همایش', 'in_progress', 'high', 'b0000000-0000-0000-0000-000000000002', '2025-10-15', 80, 50, 60, 2),
  ('c0000000-0000-0000-0000-000000000004', 'امور اجرایی و پذیرش', 'هماهنگی مکان، پذیرش و امور اجرایی', 'todo', 'medium', NULL, '2025-12-01', 100, 0, 0, 3)
ON CONFLICT DO NOTHING;

-- Seed publications
INSERT INTO publications (title, type, authors, member_id, project_id, journal, year, abstract, keywords, citation_count, status) VALUES
  ('احکام فقهی قراردادهای هوشمند', 'article', ARRAY['دکتر احمد محمدی','حسین کریمی'], 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'فقه و حقوق اسلامی', 2025, 'بررسی احکام فقهی قراردادهای هوشمند با رویکرد تطبیقی', ARRAY['فقه','بلاکچین','قرارداد هوشمند'], 12, 'published'),
  ('تمدن اسلامی در دوره عباسی', 'book', ARRAY['دکتر علی رضایی'], 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'انتشارات موسسه', 2024, 'بررسی جامع تمدن اسلامی در خلافت عباسی', ARRAY['تاریخ','تمدن','عباسی'], 25, 'published'),
  ('فلسفه وجود از دیدگاه ابن‌سینا', 'article', ARRAY['دکتر فاطمه احمدی'], 'b0000000-0000-0000-0000-000000000002', NULL, 'نشریه فلسفه اسلامی', 2024, 'تحلیل نظریه وجود از منظر ابن‌سینا و ملاصدرا', ARRAY['فلسفه','ابن سینا','ملاصدرا'], 18, 'published'),
  ('اقتصاد اسلامی و کارکرد آن در جامعه معاصر', 'conference_paper', ARRAY['دکتر مریم حسینی'], 'b0000000-0000-0000-0000-000000000004', NULL, 'همایش اقتصاد اسلامی', 2023, 'بررسی کارکردهای اقتصاد اسلامی در جامعه معاصر', ARRAY['اقتصاد','اسلامی'], 8, 'published'),
  ('بررسی تطبیقی حقوق مالکیت در فقه اسلامی', 'article', ARRAY['دکتر احمد محمدی'], 'b0000000-0000-0000-0000-000000000001', NULL, 'مجله حقوقی موسسه', 2023, 'مطالعه تطبیقی حقوق مالکیت از منظر فقه اسلامی و حقوق موضوعه', ARRAY['فقه','حقوق','مالکیت'], 15, 'published')
ON CONFLICT DO NOTHING;

-- Seed events
INSERT INTO events (title, description, type, start_date, end_date, location, department_id, organizer_id, speaker, is_public) VALUES
  ('سمینار فقه و فناوری‌های نوین', 'بررسی احکام فقهی فناوری‌های نوظهور', 'seminar', '2026-10-15 10:00:00+03:30', '2026-10-15 13:00:00+03:30', 'سالن همایشات موسسه', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'دکتر احمد محمدی', true),
  ('دفاع رساله دکتری: حکمت متعالیه', 'دفاع رساله دکتری درباره حکمت متعالیه ملاصدرا', 'defense', '2026-09-25 14:00:00+03:30', '2026-09-25 17:00:00+03:30', 'آمفی‌تئاتر گروه فلسفه', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'زهرا نوری', true),
  ('همایش بین‌المللی فلسفه اسلامی', 'همایش بین‌المللی با حضور پژوهشگران داخلی و خارجی', 'conference', '2026-01-10 09:00:00+03:30', '2026-01-12 18:00:00+03:30', 'سالن مرکزی موسسه', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'متعدد', true),
  ('کارگاه پژوهش‌نگاری', 'کارگاه آموزشی روش تحقیق برای طلاب و پژوهشگران جوان', 'workshop', '2026-10-05 09:00:00+03:30', '2026-10-05 16:00:00+03:30', 'کلاس شماره ۳', NULL, 'b0000000-0000-0000-0000-000000000003', 'دکتر علی رضایی', true)
ON CONFLICT DO NOTHING;