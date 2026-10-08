-- A durable lease works with Neon's transaction-mode pooled connections.
CREATE TABLE worker_leases (
  name text PRIMARY KEY,
  owner uuid NOT NULL,
  expires_at timestamptz NOT NULL
);
