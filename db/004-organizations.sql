CREATE TABLE organizations (
  name text PRIMARY KEY CHECK (length(name) BETWEEN 1 AND 80 AND name = btrim(name)),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO organizations(name) VALUES ('BEM'), ('BPM'), ('LPM');
INSERT INTO organizations(name)
  SELECT DISTINCT organization FROM users WHERE organization IS NOT NULL
  ON CONFLICT (name) DO NOTHING;
CREATE UNIQUE INDEX organizations_name_case_insensitive ON organizations(lower(name));
ALTER TABLE users DROP CONSTRAINT users_organization_check;
ALTER TABLE users ADD CONSTRAINT users_organization_fkey
  FOREIGN KEY (organization) REFERENCES organizations(name);
