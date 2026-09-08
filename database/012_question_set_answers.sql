CREATE TABLE question_set_answers (
  set_question_id uuid PRIMARY KEY REFERENCES set_questions(id) ON DELETE CASCADE,
  question_version_id uuid NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
  correct_choice_id uuid NOT NULL,
  updated_by uuid NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (correct_choice_id, question_version_id)
    REFERENCES question_choices(id, question_version_id) ON DELETE RESTRICT
);

COMMENT ON TABLE question_set_answers IS
  'Set answer keys for a specific question version. Existing assignment grading keys remain independent.';
