/*
# Add board columns for Trello-like Kanban boards (retry)

This migration adds a `project_columns` table so each project can have custom
columns (lists) like a Trello board. Tasks are linked to columns. Columns and
tasks within columns are reorderable via drag-and-drop.

## Tables Created/Modified

1. `project_columns` — custom kanban columns per project
   - id, project_id, title, position (sort order), color, created_at
2. `tasks` — modified to add `column_id` and `position` columns

## Security
- RLS enabled on project_columns with anon+authenticated access
*/

CREATE TABLE IF NOT EXISTS project_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text DEFAULT 'slate',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "col_select_all" ON project_columns;
CREATE POLICY "col_select_all" ON project_columns FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "col_insert_auth" ON project_columns;
CREATE POLICY "col_insert_auth" ON project_columns FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "col_update_auth" ON project_columns;
CREATE POLICY "col_update_auth" ON project_columns FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "col_delete_auth" ON project_columns;
CREATE POLICY "col_delete_auth" ON project_columns FOR DELETE
  TO authenticated USING (true);

-- Add column_id and position to tasks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'column_id') THEN
    ALTER TABLE tasks ADD COLUMN column_id uuid REFERENCES project_columns(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'position') THEN
    ALTER TABLE tasks ADD COLUMN position integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create default columns for each existing project
INSERT INTO project_columns (project_id, title, position, color)
SELECT p.id, 'در صف انجام', 0, 'slate'
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM project_columns pc WHERE pc.project_id = p.id AND pc.position = 0)
ON CONFLICT DO NOTHING;

INSERT INTO project_columns (project_id, title, position, color)
SELECT p.id, 'در حال انجام', 1, 'sky'
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM project_columns pc WHERE pc.project_id = p.id AND pc.position = 1)
ON CONFLICT DO NOTHING;

INSERT INTO project_columns (project_id, title, position, color)
SELECT p.id, 'در حال بررسی', 2, 'amber'
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM project_columns pc WHERE pc.project_id = p.id AND pc.position = 2)
ON CONFLICT DO NOTHING;

INSERT INTO project_columns (project_id, title, position, color)
SELECT p.id, 'انجام شده', 3, 'emerald'
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM project_columns pc WHERE pc.project_id = p.id AND pc.position = 3)
ON CONFLICT DO NOTHING;

-- Link existing tasks to columns based on their status
UPDATE tasks t
SET column_id = sub.id
FROM (
  SELECT t2.id AS task_id, pc.id
  FROM tasks t2
  JOIN project_columns pc ON pc.project_id = t2.project_id
  WHERE
    (t2.status = 'todo' AND pc.position = 0) OR
    (t2.status = 'in_progress' AND pc.position = 1) OR
    (t2.status = 'review' AND pc.position = 2) OR
    (t2.status = 'done' AND pc.position = 3) OR
    (t2.status = 'blocked' AND pc.position = 0)
) sub
WHERE t.id = sub.task_id AND t.column_id IS NULL;

-- Set positions for tasks within their columns
DO $$
DECLARE
  col_id uuid;
  task_id uuid;
  pos integer;
BEGIN
  FOR col_id IN SELECT id FROM project_columns LOOP
    pos := 0;
    FOR task_id IN SELECT id FROM tasks WHERE column_id = col_id ORDER BY sort_order LOOP
      UPDATE tasks SET position = pos WHERE id = task_id;
      pos := pos + 1;
    END LOOP;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_project_columns_project ON project_columns(project_id);
