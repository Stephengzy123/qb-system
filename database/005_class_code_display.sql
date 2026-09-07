ALTER TABLE classes ADD COLUMN class_code text;

COMMENT ON COLUMN classes.class_code IS
  'Current displayable enrollment code. Access is restricted to authorized class staff; the hash remains the lookup key.';
