CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE record_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE membership_status AS ENUM ('pending', 'active', 'rejected');
CREATE TYPE assignment_status AS ENUM ('draft', 'open', 'closed');
CREATE TYPE student_assignment_status AS ENUM ('not_started', 'in_progress', 'submitted', 'reopened');
CREATE TYPE asset_status AS ENUM ('staging', 'active', 'missing', 'broken', 'pending_deletion');
CREATE TYPE import_status AS ENUM ('pending', 'uploading', 'processing', 'completed', 'completed_with_errors', 'cancelled', 'failed');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  default_role user_role NOT NULL,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_folder_id uuid REFERENCES folders(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (parent_folder_id, name)
);

CREATE TABLE folder_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT true,
  can_upload boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_publish boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, folder_id)
);

CREATE TABLE question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  status record_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type text NOT NULL DEFAULT 'mcq' CHECK (question_type = 'mcq'),
  current_version_id uuid,
  cleanup_eligible_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE question_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  choice_count integer NOT NULL CHECK (choice_count BETWEEN 2 AND 10),
  alt_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, version_number),
  UNIQUE (id, question_id)
);

ALTER TABLE questions
  ADD CONSTRAINT questions_current_version_fk
  FOREIGN KEY (current_version_id, id)
  REFERENCES question_versions(id, question_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE question_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
  display_order smallint NOT NULL CHECK (display_order >= 0),
  display_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_version_id, display_order),
  UNIQUE (id, question_version_id)
);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id uuid REFERENCES question_versions(id) ON DELETE RESTRICT,
  storage_key text NOT NULL UNIQUE,
  original_storage_key text,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  width integer CHECK (width > 0),
  height integer CHECK (height > 0),
  checksum_sha256 text,
  status asset_status NOT NULL DEFAULT 'staging',
  cleanup_eligible_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE set_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, question_id),
  UNIQUE (set_id, position)
);

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  class_code_hash text NOT NULL UNIQUE,
  class_code_rotated_at timestamptz NOT NULL DEFAULT now(),
  class_code_revoked_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE class_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL CHECK (role IN ('student', 'teacher')),
  status membership_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  UNIQUE (class_id, user_id)
);

CREATE TABLE class_folder_access (
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, folder_id)
);

CREATE TABLE class_set_access (
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, set_id)
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  source_set_id uuid REFERENCES question_sets(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  instructions text,
  open_at timestamptz,
  due_at timestamptz,
  shuffle_questions boolean NOT NULL DEFAULT false,
  show_score boolean NOT NULL DEFAULT false,
  show_correctness boolean NOT NULL DEFAULT false,
  show_correct_answers boolean NOT NULL DEFAULT false,
  feedback_released_at timestamptz,
  status assignment_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES users(id),
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (due_at IS NULL OR open_at IS NULL OR due_at > open_at)
);

CREATE TABLE assignment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_version_id uuid NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
  grading_choice_id uuid,
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, question_version_id),
  UNIQUE (assignment_id, position),
  FOREIGN KEY (grading_choice_id, question_version_id)
    REFERENCES question_choices(id, question_version_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE student_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status student_assignment_status NOT NULL DEFAULT 'not_started',
  randomized_question_ids jsonb,
  current_position integer NOT NULL DEFAULT 0 CHECK (current_position >= 0),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  opened_at timestamptz,
  submitted_at timestamptz,
  is_late boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_assignment_id uuid NOT NULL REFERENCES student_assignments(id) ON DELETE CASCADE,
  assignment_question_id uuid NOT NULL REFERENCES assignment_questions(id) ON DELETE RESTRICT,
  selected_choice_id uuid REFERENCES question_choices(id) ON DELETE RESTRICT,
  is_correct boolean,
  graded_at timestamptz,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_assignment_id, assignment_question_id)
);

CREATE TABLE submission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_assignment_id uuid NOT NULL REFERENCES student_assignments(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('submitted', 'reopened')),
  actor_user_id uuid NOT NULL REFERENCES users(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid REFERENCES question_sets(id) ON DELETE SET NULL,
  status import_status NOT NULL DEFAULT 'pending',
  source_name text NOT NULL,
  total_files integer NOT NULL DEFAULT 0,
  succeeded_files integer NOT NULL DEFAULT 0,
  failed_files integer NOT NULL DEFAULT 0,
  cancelled_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE import_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  source_path text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'uploaded', 'processing', 'succeeded', 'failed', 'cancelled')),
  failure_reason text,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, source_path)
);

CREATE TABLE reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  matched_count integer NOT NULL DEFAULT 0,
  unknown_count integer NOT NULL DEFAULT 0,
  missing_count integer NOT NULL DEFAULT 0,
  invalid_count integer NOT NULL DEFAULT 0,
  started_by uuid REFERENCES users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX folders_parent_idx ON folders(parent_folder_id);
CREATE INDEX question_versions_question_idx ON question_versions(question_id, version_number DESC);
CREATE INDEX assets_version_idx ON assets(question_version_id);
CREATE INDEX assets_cleanup_idx ON assets(cleanup_eligible_at) WHERE cleanup_eligible_at IS NOT NULL;
CREATE INDEX set_questions_set_order_idx ON set_questions(set_id, position);
CREATE INDEX memberships_user_status_idx ON class_memberships(user_id, status);
CREATE INDEX assignments_class_status_idx ON assignments(class_id, status);
CREATE INDEX student_assignments_student_status_idx ON student_assignments(student_id, status);
CREATE INDEX responses_student_assignment_idx ON responses(student_assignment_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_user_id, created_at DESC);

COMMENT ON COLUMN assignment_questions.grading_choice_id IS
  'Assignment-owned grading key. It may be added or corrected with audit logging and regrading without mutating immutable question content.';
COMMENT ON COLUMN student_assignments.revision IS
  'Optimistic concurrency counter used to reject stale autosave writes.';
