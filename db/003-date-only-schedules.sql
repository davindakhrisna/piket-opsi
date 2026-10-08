-- Keep historical clock values intact; new schedules only need a calendar date.
ALTER TABLE schedules
  ALTER COLUMN start_minute DROP NOT NULL,
  ALTER COLUMN end_minute DROP NOT NULL;
