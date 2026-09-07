CREATE TYPE account_status AS ENUM ('pending', 'active', 'rejected');

ALTER TABLE users
  ADD COLUMN approval_status account_status NOT NULL DEFAULT 'pending',
  ADD COLUMN approved_by uuid REFERENCES users(id),
  ADD COLUMN approved_at timestamptz;

CREATE INDEX users_approval_status_idx ON users(approval_status, default_role);
