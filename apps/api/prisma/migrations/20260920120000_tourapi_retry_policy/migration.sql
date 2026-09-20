ALTER TABLE tour_api_job_daily_usage ADD COLUMN retry_calls INTEGER NOT NULL DEFAULT 0 CHECK (retry_calls >= 0 AND retry_calls <= calls);
CREATE TABLE tour_api_provider_cooldown (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  until_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('AUTH','QUOTA','THROTTLE'))
);
