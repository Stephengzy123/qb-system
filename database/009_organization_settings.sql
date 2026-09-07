CREATE TABLE organization_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO organization_settings (singleton, name)
VALUES (true, 'AOMA');
