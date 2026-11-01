-- Workspace data that used to live in the JSON file store.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role    TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  ADD COLUMN IF NOT EXISTS name    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS forms (
  id         TEXT PRIMARY KEY,
  title      TEXT    NOT NULL DEFAULT '',
  intro      TEXT    NOT NULL DEFAULT '',
  fields     JSONB   NOT NULL DEFAULT '[]',
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id      TEXT PRIMARY KEY,
  form_id TEXT        NOT NULL REFERENCES forms (id) ON DELETE CASCADE,
  at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  values  JSONB       NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS submissions_form_idx ON submissions (form_id);

CREATE TABLE IF NOT EXISTS inbox (
  seq     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id      TEXT        NOT NULL UNIQUE,
  at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT        NOT NULL DEFAULT '',
  addr    TEXT        NOT NULL DEFAULT '',
  text    TEXT        NOT NULL DEFAULT '',
  dir     TEXT        NOT NULL CHECK (dir IN ('in', 'out')),
  bot     BOOLEAN     NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS leads (
  seq   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id    TEXT        NOT NULL UNIQUE,
  at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  name  TEXT        NOT NULL DEFAULT '',
  phone TEXT        NOT NULL DEFAULT '',
  email TEXT        NOT NULL DEFAULT ''
);
