CREATE TABLE chat_requests (
  subject_key TEXT NOT NULL,
  request_id UUID NOT NULL,
  payload_hash TEXT NOT NULL,
  day DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('RESERVED', 'COMPLETED', 'REFUNDED', 'CANCELLED')),
  attempt_id UUID NOT NULL,
  reply TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (subject_key, request_id)
);
CREATE INDEX chat_requests_day_idx ON chat_requests(day);
