ALTER TABLE assignments ALTER COLUMN class_id DROP NOT NULL;
ALTER TABLE assignments ADD COLUMN practice_student_id uuid REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE assignments ADD CONSTRAINT assignments_work_kind CHECK (
  (practice_student_id IS NULL AND class_id IS NOT NULL) OR
  (practice_student_id IS NOT NULL AND class_id IS NULL AND due_at IS NULL)
);
ALTER TABLE assignments ADD COLUMN practice_request_id uuid UNIQUE;
CREATE INDEX assignments_practice_student_idx ON assignments(practice_student_id) WHERE practice_student_id IS NOT NULL;
