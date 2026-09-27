/*
# Advanced Project Management tables

Adds: task dependencies, subtasks, milestones, task comments,
risk management, activity feed, time tracking, and project health.

## Tables

1. task_dependencies — FS/SS/FF/SF relationships between tasks
2. milestones — project milestones with due dates and status
3. task_comments — comments on tasks for collaboration
4. risks — risk management with probability/impact matrix
5. activity_feed — audit log of all project activities
6. time_entries — time tracking per task
*/

-- ============ TASK DEPENDENCIES ============
CREATE TABLE IF NOT EXISTS task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  predecessor_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  successor_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'FS' CHECK (type IN ('FS','SS','FF','SF')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dep_select_all" ON task_dependencies;
CREATE POLICY "dep_select_all" ON task_dependencies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "dep_insert_auth" ON task_dependencies;
CREATE POLICY "dep_insert_auth" ON task_dependencies FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "dep_update_auth" ON task_dependencies;
CREATE POLICY "dep_update_auth" ON task_dependencies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "dep_delete_auth" ON task_dependencies;
CREATE POLICY "dep_delete_auth" ON task_dependencies FOR DELETE TO authenticated USING (true);

-- ============ MILESTONES ============
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','overdue')),
  owner_id uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ms_select_all" ON milestones;
CREATE POLICY "ms_select_all" ON milestones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ms_insert_auth" ON milestones;
CREATE POLICY "ms_insert_auth" ON milestones FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ms_update_auth" ON milestones;
CREATE POLICY "ms_update_auth" ON milestones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ms_delete_auth" ON milestones;
CREATE POLICY "ms_delete_auth" ON milestones FOR DELETE TO authenticated USING (true);

-- ============ TASK COMMENTS ============
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES members(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cmt_select_all" ON task_comments;
CREATE POLICY "cmt_select_all" ON task_comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "cmt_insert_auth" ON task_comments;
CREATE POLICY "cmt_insert_auth" ON task_comments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "cmt_update_auth" ON task_comments;
CREATE POLICY "cmt_update_auth" ON task_comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cmt_delete_auth" ON task_comments;
CREATE POLICY "cmt_delete_auth" ON task_comments FOR DELETE TO authenticated USING (true);

-- ============ RISKS ============
CREATE TABLE IF NOT EXISTS risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  probability integer NOT NULL DEFAULT 1 CHECK (probability BETWEEN 1 AND 5),
  impact integer NOT NULL DEFAULT 1 CHECK (impact BETWEEN 1 AND 5),
  owner_id uuid REFERENCES members(id) ON DELETE SET NULL,
  mitigation text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigating','closed')),
  due_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "risk_select_all" ON risks;
CREATE POLICY "risk_select_all" ON risks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "risk_insert_auth" ON risks;
CREATE POLICY "risk_insert_auth" ON risks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "risk_update_auth" ON risks;
CREATE POLICY "risk_update_auth" ON risks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "risk_delete_auth" ON risks;
CREATE POLICY "risk_delete_auth" ON risks FOR DELETE TO authenticated USING (true);

-- ============ ACTIVITY FEED ============
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES members(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "act_select_all" ON activity_feed;
CREATE POLICY "act_select_all" ON activity_feed FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "act_insert_auth" ON activity_feed;
CREATE POLICY "act_insert_auth" ON activity_feed FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "act_delete_auth" ON activity_feed;
CREATE POLICY "act_delete_auth" ON activity_feed FOR DELETE TO authenticated USING (true);

-- ============ TIME ENTRIES ============
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  hours numeric(5,2) NOT NULL DEFAULT 0,
  description text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "te_select_all" ON time_entries;
CREATE POLICY "te_select_all" ON time_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "te_insert_auth" ON time_entries;
CREATE POLICY "te_insert_auth" ON time_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "te_update_auth" ON time_entries;
CREATE POLICY "te_update_auth" ON time_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "te_delete_auth" ON time_entries;
CREATE POLICY "te_delete_auth" ON time_entries FOR DELETE TO authenticated USING (true);

-- ============ ADD parent_task_id TO TASKS (subtasks) ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'parent_task_id') THEN
    ALTER TABLE tasks ADD COLUMN parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============ SEED SAMPLE DATA ============

-- Milestones for existing projects
INSERT INTO milestones (project_id, title, due_date, status, owner_id)
SELECT p.id, 'شروع پروژه', p.start_date, 'completed', p.leader_id
FROM projects p
WHERE p.start_date IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO milestones (project_id, title, due_date, status)
SELECT p.id, 'تأیید طرح پژوهشی', p.start_date + interval '30 days', 'completed'
FROM projects p
WHERE p.start_date IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO milestones (project_id, title, due_date, status)
SELECT p.id, 'پایان فاز اول', p.start_date + interval '90 days', 'in_progress'
FROM projects p
WHERE p.start_date IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO milestones (project_id, title, due_date, status)
SELECT p.id, 'تحویل گزارش نهایی', p.end_date, 'pending'
FROM projects p
WHERE p.end_date IS NOT NULL
ON CONFLICT DO NOTHING;

-- Sample risks
INSERT INTO risks (project_id, title, probability, impact, status, description, mitigation)
SELECT p.id, 'تأخیر در دریافت تأییدیه', 3, 4, 'open', 'احتمال تأخیر در دریافت تأییدیه نهادهای بالادستی', 'ارتباط مستمر با نهادهای مربوطه و پیگیری گام‌به‌گام'
FROM projects p
LIMIT 3
ON CONFLICT DO NOTHING;

INSERT INTO risks (project_id, title, probability, impact, status, description, mitigation)
SELECT p.id, 'کمبود منابع انسانی', 2, 5, 'mitigating', 'احتمال کمبود پژوهشگر متخصص در حوزه موضوعی', 'همکاری با دانشگاه‌ها و جذب پژوهشگر مدعو'
FROM projects p
LIMIT 2
ON CONFLICT DO NOTHING;

-- Sample activity feed
INSERT INTO activity_feed (project_id, action, entity_type, description)
SELECT p.id, 'created', 'project', 'پروژه ایجاد شد'
FROM projects p
LIMIT 5
ON CONFLICT DO NOTHING;

INSERT INTO activity_feed (project_id, action, entity_type, description)
SELECT p.id, 'updated', 'project', 'اطلاعات پروژه به‌روزرسانی شد'
FROM projects p
LIMIT 5
ON CONFLICT DO NOTHING;

-- Sample time entries
INSERT INTO time_entries (task_id, hours, description, entry_date)
SELECT t.id, 4, 'کار روی مرحله اول', t.created_at::date
FROM tasks t
LIMIT 5
ON CONFLICT DO NOTHING;

INSERT INTO time_entries (task_id, hours, description, entry_date)
SELECT t.id, 6, 'تحلیل و جمع‌آوری داده', t.created_at::date + interval '1 day'
FROM tasks t
LIMIT 5
ON CONFLICT DO NOTHING;

-- Sample comments
INSERT INTO task_comments (task_id, author_id, content)
SELECT t.id, t.assignee_id, 'بررسی شد، نیاز به اصلاح جزئیات دارد.'
FROM tasks t
WHERE t.assignee_id IS NOT NULL
LIMIT 3
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_deps_predecessor ON task_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_deps_successor ON task_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_risks_project ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_feed(project_id);
CREATE INDEX IF NOT EXISTS idx_time_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
