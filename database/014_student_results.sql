ALTER TABLE users ADD COLUMN duplicate_of_id uuid REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT users_not_own_duplicate CHECK (duplicate_of_id IS NULL OR duplicate_of_id<>id);
CREATE INDEX responses_assignment_question_idx ON responses(assignment_question_id);
