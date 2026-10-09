ALTER TABLE users DROP CONSTRAINT users_organization_fkey;
ALTER TABLE users ADD CONSTRAINT users_organization_fkey
  FOREIGN KEY (organization) REFERENCES organizations(name)
  ON UPDATE CASCADE ON DELETE RESTRICT;
