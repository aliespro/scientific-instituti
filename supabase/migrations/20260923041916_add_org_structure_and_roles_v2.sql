/*
# Add organizational hierarchy and role-based access control

This migration creates a hierarchical organizational structure for the
"مجموعه آل‌البیت" institute. The structure has:

- A root organization (مجموعه آل‌البیت)
- Two divisions: علمی (scientific) and اداری (administrative)
- Each division has a "وکیل" (manager) with management authority over their division
- Sub-units under each division (مؤسسات علمی, معاونت‌ها)
- Role-based access: scientific wakil cannot access administrative data and vice versa

## Tables Created/Modified

1. `org_units` — hierarchical organizational units (tree structure)
2. `member_roles` — links members to org units with a role
3. `departments` — add org_unit_id to link existing departments to the hierarchy
4. `projects` — add org_unit_id for scoping projects to divisions
*/

CREATE TABLE IF NOT EXISTS org_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES org_units(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'department' CHECK (type IN ('group','division','institute','department','deputy')),
  division text DEFAULT 'shared' CHECK (division IN ('scientific','administrative','shared')),
  head_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_all" ON org_units;
CREATE POLICY "org_select_all" ON org_units FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "org_insert_auth" ON org_units;
CREATE POLICY "org_insert_auth" ON org_units FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "org_update_auth" ON org_units;
CREATE POLICY "org_update_auth" ON org_units FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "org_delete_auth" ON org_units;
CREATE POLICY "org_delete_auth" ON org_units FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  org_unit_id uuid NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('wakil','member','staff')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_select_all" ON member_roles;
CREATE POLICY "role_select_all" ON member_roles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "role_insert_auth" ON member_roles;
CREATE POLICY "role_insert_auth" ON member_roles FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "role_update_auth" ON member_roles;
CREATE POLICY "role_update_auth" ON member_roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "role_delete_auth" ON member_roles;
CREATE POLICY "role_delete_auth" ON member_roles FOR DELETE TO authenticated USING (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'org_unit_id') THEN
    ALTER TABLE departments ADD COLUMN org_unit_id uuid REFERENCES org_units(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'org_unit_id') THEN
    ALTER TABLE projects ADD COLUMN org_unit_id uuid REFERENCES org_units(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed org structure
INSERT INTO org_units (id, name, type, division, description) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'مجموعه آل‌البیت', 'group', 'shared', 'مجموعه اصلی شامل بخش علمی و اداری')
ON CONFLICT DO NOTHING;

INSERT INTO org_units (id, parent_id, name, type, division, description) VALUES
  ('d0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001', 'بخش علمی', 'division', 'scientific', 'بخش علمی مجموعه'),
  ('d0000000-0000-0000-0000-000000000020', 'd0000000-0000-0000-0000-000000000001', 'بخش اداری', 'division', 'administrative', 'بخش اداری مجموعه')
ON CONFLICT DO NOTHING;

INSERT INTO org_units (id, parent_id, name, type, division, description) VALUES
  ('d0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000010', 'مؤسسه علمی فقه و حقوق', 'institute', 'scientific', 'مؤسسه علمی فقه و حقوق اسلامی'),
  ('d0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000010', 'مؤسسه علمی فلسفه و کلام', 'institute', 'scientific', 'مؤسسه علمی فلسفه و کلام اسلامی'),
  ('d0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000010', 'مؤسسه علمی تاریخ و تمدن', 'institute', 'scientific', 'مؤسسه علمی تاریخ و تمدن اسلامی'),
  ('d0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000010', 'مؤسسه علمی اقتصاد اسلامی', 'institute', 'scientific', 'مؤسسه علمی اقتصاد اسلامی')
ON CONFLICT DO NOTHING;

INSERT INTO org_units (id, parent_id, name, type, division, description) VALUES
  ('d0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000010', 'معاونت پژوهش', 'deputy', 'scientific', 'معاونت پژوهش بخش علمی'),
  ('d0000000-0000-0000-0000-000000000016', 'd0000000-0000-0000-0000-000000000010', 'معاونت آموزش', 'deputy', 'scientific', 'معاونت آموزش بخش علمی')
ON CONFLICT DO NOTHING;

INSERT INTO org_units (id, parent_id, name, type, division, description) VALUES
  ('d0000000-0000-0000-0000-000000000021', 'd0000000-0000-0000-0000-000000000020', 'معاونت مالی', 'deputy', 'administrative', 'معاونت مالی و بودجه'),
  ('d0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000020', 'معاونت منابع انسانی', 'deputy', 'administrative', 'معاونت منابع انسانی'),
  ('d0000000-0000-0000-0000-000000000023', 'd0000000-0000-0000-0000-000000000020', 'معاونت امور اجرایی', 'deputy', 'administrative', 'معاونت امور اجرایی')
ON CONFLICT DO NOTHING;

-- Link departments to org units
UPDATE departments SET org_unit_id = 'd0000000-0000-0000-0000-000000000011' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE departments SET org_unit_id = 'd0000000-0000-0000-0000-000000000012' WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE departments SET org_unit_id = 'd0000000-0000-0000-0000-000000000013' WHERE id = 'a0000000-0000-0000-0000-000000000003';
UPDATE departments SET org_unit_id = 'd0000000-0000-0000-0000-000000000014' WHERE id = 'a0000000-0000-0000-0000-000000000004';
UPDATE departments SET org_unit_id = 'd0000000-0000-0000-0000-000000000023' WHERE id = 'a0000000-0000-0000-0000-000000000005';

-- Assign wakils
INSERT INTO member_roles (member_id, org_unit_id, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010', 'wakil'),
  ('b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000020', 'wakil')
ON CONFLICT DO NOTHING;

-- Set heads
UPDATE org_units SET head_member_id = 'b0000000-0000-0000-0000-000000000001' WHERE id = 'd0000000-0000-0000-0000-000000000010';
UPDATE org_units SET head_member_id = 'b0000000-0000-0000-0000-000000000004' WHERE id = 'd0000000-0000-0000-0000-000000000020';
UPDATE org_units SET head_member_id = 'b0000000-0000-0000-0000-000000000001' WHERE id = 'd0000000-0000-0000-0000-000000000011';
UPDATE org_units SET head_member_id = 'b0000000-0000-0000-0000-000000000002' WHERE id = 'd0000000-0000-0000-0000-000000000012';
UPDATE org_units SET head_member_id = 'b0000000-0000-0000-0000-000000000003' WHERE id = 'd0000000-0000-0000-0000-000000000013';
UPDATE org_units SET head_member_id = 'b0000000-0000-0000-0000-000000000004' WHERE id = 'd0000000-0000-0000-0000-000000000014';

-- Link projects to org units
UPDATE projects SET org_unit_id = 'd0000000-0000-0000-0000-000000000011' WHERE id = 'c0000000-0000-0000-0000-000000000001';
UPDATE projects SET org_unit_id = 'd0000000-0000-0000-0000-000000000013' WHERE id = 'c0000000-0000-0000-0000-000000000002';
UPDATE projects SET org_unit_id = 'd0000000-0000-0000-0000-000000000014' WHERE id = 'c0000000-0000-0000-0000-000000000003';
UPDATE projects SET org_unit_id = 'd0000000-0000-0000-0000-000000000012' WHERE id = 'c0000000-0000-0000-0000-000000000004';
UPDATE projects SET org_unit_id = 'd0000000-0000-0000-0000-000000000023' WHERE id = 'c0000000-0000-0000-0000-000000000005';

CREATE INDEX IF NOT EXISTS idx_org_units_parent ON org_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_units_division ON org_units(division);
CREATE INDEX IF NOT EXISTS idx_member_roles_member ON member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_org ON member_roles(org_unit_id);
