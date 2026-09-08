ALTER TABLE import_files ADD COLUMN position integer NOT NULL DEFAULT 0 CHECK (position >= 0);
ALTER TABLE imports ADD COLUMN choice_count integer NOT NULL DEFAULT 4 CHECK (choice_count BETWEEN 2 AND 10);
