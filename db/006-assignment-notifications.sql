ALTER TABLE email_jobs DROP CONSTRAINT email_jobs_state_check;
ALTER TABLE email_jobs ADD CONSTRAINT email_jobs_state_check
  CHECK (state IN ('waiting', 'pending', 'sending', 'sent', 'cancelled', 'review'));
CREATE INDEX email_jobs_assignment_notified ON email_jobs(schedule_id, member_id)
  WHERE kind = 'assignment' AND state = 'sent';
CREATE TABLE notification_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  daily_hour smallint CHECK (daily_hour BETWEEN 0 AND 23),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO notification_settings(daily_hour) VALUES (7);
