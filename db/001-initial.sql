CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  organization text CHECK (organization IN ('BEM', 'BPM', 'LPM')),
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  password_hash text NOT NULL,
  initial_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((role = 'member' AND organization IS NOT NULL) OR role = 'admin')
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE login_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  resets_at timestamptz NOT NULL
);
CREATE TABLE schedules (
  id uuid PRIMARY KEY,
  date date NOT NULL,
  start_minute integer NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute integer NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  version integer NOT NULL DEFAULT 1,
  mail_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_minute > start_minute),
  CHECK (date BETWEEN '2000-01-01' AND '2100-12-31')
);
CREATE INDEX schedules_date ON schedules(date);
CREATE TABLE assignments (
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'done', 'skipped')),
  PRIMARY KEY (schedule_id, member_id)
);
CREATE INDEX assignments_member ON assignments(member_id);
CREATE TABLE email_jobs (
  id uuid PRIMARY KEY,
  job_key text NOT NULL UNIQUE,
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES users(id),
  mail_version integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('assignment', 'reminder')),
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sending', 'sent', 'cancelled', 'review')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  uncertain_since timestamptz,
  provider_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX email_jobs_queue ON email_jobs(state, next_attempt_at);
CREATE TABLE email_budget (
  period text PRIMARY KEY,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0)
);
CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL REFERENCES users(id),
  action text NOT NULL,
  target_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
