-- Admin portal: an "admin" role, account status, sign-in tracking, demo requests and an audit log.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'member'));
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS disabled      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Every "Book a demo" submission, kept for follow-up even after the workspace imports it as a contact.
CREATE TABLE IF NOT EXISTS demo_requests (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  name      TEXT NOT NULL DEFAULT '',
  email     TEXT NOT NULL DEFAULT '',
  phone     TEXT NOT NULL DEFAULT '',
  company   TEXT NOT NULL DEFAULT '',
  employees TEXT NOT NULL DEFAULT '',
  interest  TEXT NOT NULL DEFAULT '',
  status    TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  note      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS demo_requests_status_idx ON demo_requests (status, at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor      TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL,
  target     TEXT NOT NULL DEFAULT '',
  detail     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log (at DESC);

-- Support tickets submitted from the public Support page and handled in the admin portal.
CREATE TABLE IF NOT EXISTS support_tickets (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  name     TEXT NOT NULL DEFAULT '',
  email    TEXT NOT NULL,
  subject  TEXT NOT NULL,
  message  TEXT NOT NULL,
  status   TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  assignee TEXT NOT NULL DEFAULT '',
  note     TEXT NOT NULL DEFAULT '',
  replied_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status, at DESC);
