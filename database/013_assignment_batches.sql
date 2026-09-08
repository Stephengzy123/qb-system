CREATE TABLE assignment_batches (
  id uuid PRIMARY KEY,
  created_by uuid NOT NULL REFERENCES users(id),
  request_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE assignments ADD COLUMN batch_id uuid REFERENCES assignment_batches(id);
CREATE UNIQUE INDEX assignments_batch_class_idx ON assignments(batch_id,class_id) WHERE batch_id IS NOT NULL;
CREATE TABLE assignment_sets (
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES question_sets(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position >= 0),
  PRIMARY KEY(assignment_id,set_id),
  UNIQUE(assignment_id,position)
);
INSERT INTO assignment_sets(assignment_id,set_id,position)
  SELECT id,source_set_id,0 FROM assignments WHERE source_set_id IS NOT NULL;
