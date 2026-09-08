ALTER TABLE organization_settings
  ADD COLUMN logo_storage_key text,
  ADD COLUMN favicon_storage_key text,
  ADD COLUMN logo_mime_type text,
  ADD COLUMN logo_byte_size integer CHECK (logo_byte_size IS NULL OR logo_byte_size BETWEEN 1 AND 524288),
  ADD COLUMN logo_updated_at timestamptz;
