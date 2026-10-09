ALTER TABLE users
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
