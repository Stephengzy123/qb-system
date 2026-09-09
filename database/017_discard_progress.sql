-- Local drafts older than this revision must never be restored after a reset.
ALTER TABLE student_assignments ADD COLUMN discarded_revision integer NOT NULL DEFAULT 0
  CHECK (discarded_revision >= 0 AND discarded_revision <= revision);
