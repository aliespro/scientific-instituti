/*
# Correspondence & Office Automation Module (مکاتبات و اتوماسیون اداری)

## Summary
Creates the full database schema for the correspondence module of the Al-Albayt
comprehensive system. This module integrates secretariat, letters, workflow,
referrals, comments, attachments, archive, search, audit log, and notifications
into a single system that connects to projects, tasks, events, and the
organizational structure.

## New Tables

1. `secretariats` — Multiple secretariats (Scientific, Administrative, Institute)
   scoped to org units. Controls letter numbering per secretariat per year.
2. `letters` — The core letter entity with number, date, subject, type, sender,
   recipient, security level, priority, status, body, relations to projects/
   events/tasks, workflow status, and deadlines.
3. `letter_recipients` — Explicit recipients (To) for each letter.
4. `letter_ccs` — Carbon copy (CC) recipients for each letter.
5. `letter_referrals` — Referral chain: from→to with instruction, deadline,
   priority, and status. Preserves the full chain history.
6. `letter_comments` — Paraf / margin notes / instructions on letters.
7. `letter_attachments` — File attachments with name, size, type, URL, and hash.
8. `letter_audit_log` — Audit trail of all sensitive operations.
9. `letter_relations` — Links between letters (reply, related, circular parent).
10. `letter_numbering_seq` — Sequence table for per-secretariat per-year numbering.

## Security
- RLS enabled on all tables.
- SELECT open to anon+authenticated (organizational shared data).
- Full CRUD open to anon+authenticated.

## Notes
- Letter numbering is sequential per secretariat per year, stored in
  letter_numbering_seq to avoid race conditions.
- Referrals form a chain via parent_referral_id.
- Audit log captures: created, viewed, edited, forwarded, approved, rejected,
  signed, archived, downloaded.
*/

-- ===== Secretariats =====
CREATE TABLE IF NOT EXISTS secretariats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  org_unit_id uuid REFERENCES org_units(id) ON DELETE SET NULL,
  division text DEFAULT 'administrative',
  numbering_format text DEFAULT 'sequential',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE secretariats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_secretariats" ON secretariats;
CREATE POLICY "select_secretariats" ON secretariats FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_secretariats" ON secretariats;
CREATE POLICY "insert_secretariats" ON secretariats FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_secretariats" ON secretariats;
CREATE POLICY "update_secretariats" ON secretariats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_secretariats" ON secretariats;
CREATE POLICY "delete_secretariats" ON secretariats FOR DELETE
  TO anon, authenticated USING (true);

-- ===== Letters =====
CREATE TABLE IF NOT EXISTS letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_number text,
  letter_date date,
  subject text NOT NULL,
  type text NOT NULL DEFAULT 'incoming',
  status text NOT NULL DEFAULT 'draft',
  workflow_status text NOT NULL DEFAULT 'draft',
  secretariat_id uuid REFERENCES secretariats(id) ON DELETE SET NULL,
  security_level text DEFAULT 'normal',
  priority text DEFAULT 'medium',
  sender_name text,
  sender_organization text,
  recipient_name text,
  recipient_organization text,
  body text,
  related_letter_id uuid REFERENCES letters(id) ON DELETE SET NULL,
  relation_type text,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  deadline date,
  response_deadline date,
  is_archived boolean DEFAULT false,
  archived_at timestamptz,
  tags text[] DEFAULT '{}',
  indicator text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_letters" ON letters;
CREATE POLICY "select_letters" ON letters FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_letters" ON letters;
CREATE POLICY "insert_letters" ON letters FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_letters" ON letters;
CREATE POLICY "update_letters" ON letters FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_letters" ON letters;
CREATE POLICY "delete_letters" ON letters FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_letters_secretariat ON letters(secretariat_id);
CREATE INDEX IF NOT EXISTS idx_letters_type ON letters(type);
CREATE INDEX IF NOT EXISTS idx_letters_status ON letters(status);
CREATE INDEX IF NOT EXISTS idx_letters_date ON letters(letter_date DESC);
CREATE INDEX IF NOT EXISTS idx_letters_archived ON letters(is_archived);

-- ===== Letter Recipients (To) =====
CREATE TABLE IF NOT EXISTS letter_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  name text,
  organization text,
  is_external boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE letter_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_letter_recipients" ON letter_recipients;
CREATE POLICY "select_letter_recipients" ON letter_recipients FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_letter_recipients" ON letter_recipients;
CREATE POLICY "insert_letter_recipients" ON letter_recipients FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_letter_recipients" ON letter_recipients;
CREATE POLICY "update_letter_recipients" ON letter_recipients FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_letter_recipients" ON letter_recipients;
CREATE POLICY "delete_letter_recipients" ON letter_recipients FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_letter_recipients_letter ON letter_recipients(letter_id);

-- ===== Letter CCs =====
CREATE TABLE IF NOT EXISTS letter_ccs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  name text,
  organization text,
  is_external boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE letter_ccs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_letter_ccs" ON letter_ccs;
CREATE POLICY "select_letter_ccs" ON letter_ccs FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_letter_ccs" ON letter_ccs;
CREATE POLICY "insert_letter_ccs" ON letter_ccs FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_letter_ccs" ON letter_ccs;
CREATE POLICY "update_letter_ccs" ON letter_ccs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_letter_ccs" ON letter_ccs;
CREATE POLICY "delete_letter_ccs" ON letter_ccs FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_letter_ccs_letter ON letter_ccs(letter_id);

-- ===== Letter Referrals (ارجاع) =====
CREATE TABLE IF NOT EXISTS letter_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  from_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  from_name text,
  to_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  to_name text,
  instruction text,
  deadline date,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  parent_referral_id uuid REFERENCES letter_referrals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE letter_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_letter_referrals" ON letter_referrals;
CREATE POLICY "select_letter_referrals" ON letter_referrals FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_letter_referrals" ON letter_referrals;
CREATE POLICY "insert_letter_referrals" ON letter_referrals FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_letter_referrals" ON letter_referrals;
CREATE POLICY "update_letter_referrals" ON letter_referrals FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_letter_referrals" ON letter_referrals;
CREATE POLICY "delete_letter_referrals" ON letter_referrals FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_letter_referrals_letter ON letter_referrals(letter_id);
CREATE INDEX IF NOT EXISTS idx_letter_referrals_to ON letter_referrals(to_member_id);

-- ===== Letter Comments (پاراف و هامش) =====
CREATE TABLE IF NOT EXISTS letter_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  content text NOT NULL,
  type text DEFAULT 'comment',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE letter_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_letter_comments" ON letter_comments;
CREATE POLICY "select_letter_comments" ON letter_comments FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_letter_comments" ON letter_comments;
CREATE POLICY "insert_letter_comments" ON letter_comments FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_letter_comments" ON letter_comments;
CREATE POLICY "update_letter_comments" ON letter_comments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_letter_comments" ON letter_comments;
CREATE POLICY "delete_letter_comments" ON letter_comments FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_letter_comments_letter ON letter_comments(letter_id);

-- ===== Letter Attachments =====
CREATE TABLE IF NOT EXISTS letter_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  file_type text,
  file_url text NOT NULL,
  file_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE letter_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_letter_attachments" ON letter_attachments;
CREATE POLICY "select_letter_attachments" ON letter_attachments FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_letter_attachments" ON letter_attachments;
CREATE POLICY "insert_letter_attachments" ON letter_attachments FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_letter_attachments" ON letter_attachments;
CREATE POLICY "update_letter_attachments" ON letter_attachments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_letter_attachments" ON letter_attachments;
CREATE POLICY "delete_letter_attachments" ON letter_attachments FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_letter_attachments_letter ON letter_attachments(letter_id);

-- ===== Letter Audit Log =====
CREATE TABLE IF NOT EXISTS letter_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE letter_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_letter_audit_log" ON letter_audit_log;
CREATE POLICY "select_letter_audit_log" ON letter_audit_log FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_letter_audit_log" ON letter_audit_log;
CREATE POLICY "insert_letter_audit_log" ON letter_audit_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_letter_audit_letter ON letter_audit_log(letter_id);

-- ===== Letter Relations (reply / related / circular) =====
CREATE TABLE IF NOT EXISTS letter_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  target_letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  relation_type text NOT NULL DEFAULT 'related',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE letter_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_letter_relations" ON letter_relations;
CREATE POLICY "select_letter_relations" ON letter_relations FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_letter_relations" ON letter_relations;
CREATE POLICY "insert_letter_relations" ON letter_relations FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "delete_letter_relations" ON letter_relations;
CREATE POLICY "delete_letter_relations" ON letter_relations FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_letter_relations_source ON letter_relations(source_letter_id);

-- ===== Letter Numbering Sequence =====
CREATE TABLE IF NOT EXISTS letter_numbering_seq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretariat_id uuid NOT NULL REFERENCES secretariats(id) ON DELETE CASCADE,
  year int NOT NULL DEFAULT EXTRACT(year FROM now()),
  last_number int NOT NULL DEFAULT 0,
  UNIQUE(secretariat_id, year)
);

ALTER TABLE letter_numbering_seq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_letter_numbering" ON letter_numbering_seq;
CREATE POLICY "select_letter_numbering" ON letter_numbering_seq FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_letter_numbering" ON letter_numbering_seq;
CREATE POLICY "insert_letter_numbering" ON letter_numbering_seq FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_letter_numbering" ON letter_numbering_seq;
CREATE POLICY "update_letter_numbering" ON letter_numbering_seq FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);