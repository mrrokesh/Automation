-- Platform level: many isolated workspaces, plus platform admins who run them.
-- Existing single-workspace data moves into a first workspace called "Rokesh".

CREATE TABLE IF NOT EXISTS workspaces (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}$'),
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  -- Secret for POST /webhook/contact/<slug>?key=... (Shopify, Zapier, Pabbly, Make)
  inbound_key TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only create the first workspace when there is something to move into it (a fresh database starts empty).
INSERT INTO workspaces (name, slug, inbound_key)
SELECT 'Rokesh', 'rokesh', md5(random()::text || clock_timestamp()::text) || md5(clock_timestamp()::text || random()::text)
WHERE NOT EXISTS (SELECT 1 FROM workspaces)
  AND (EXISTS (SELECT 1 FROM users) OR EXISTS (SELECT 1 FROM workspace_state) OR EXISTS (SELECT 1 FROM forms)
       OR EXISTS (SELECT 1 FROM inbox) OR EXISTS (SELECT 1 FROM leads));

-- Users belong to exactly one workspace; platform admins are users with a flag.
ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id BIGINT REFERENCES workspaces (id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET workspace_id = (SELECT min(id) FROM workspaces) WHERE workspace_id IS NULL;
UPDATE users SET is_platform_admin = true WHERE role = 'owner' AND NOT EXISTS (SELECT 1 FROM users WHERE is_platform_admin);
ALTER TABLE users ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS users_workspace_idx ON users (workspace_id);

-- Workspace-owned data.
ALTER TABLE forms ADD COLUMN IF NOT EXISTS workspace_id BIGINT REFERENCES workspaces (id) ON DELETE CASCADE;
UPDATE forms SET workspace_id = (SELECT min(id) FROM workspaces) WHERE workspace_id IS NULL;
ALTER TABLE forms ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS forms_workspace_idx ON forms (workspace_id);

ALTER TABLE inbox ADD COLUMN IF NOT EXISTS workspace_id BIGINT REFERENCES workspaces (id) ON DELETE CASCADE;
UPDATE inbox SET workspace_id = (SELECT min(id) FROM workspaces) WHERE workspace_id IS NULL;
ALTER TABLE inbox ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS inbox_workspace_idx ON inbox (workspace_id, seq);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS workspace_id BIGINT REFERENCES workspaces (id) ON DELETE CASCADE;
UPDATE leads SET workspace_id = (SELECT min(id) FROM workspaces) WHERE workspace_id IS NULL;
ALTER TABLE leads ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS leads_workspace_idx ON leads (workspace_id, seq);

-- The workspace document: one row per workspace instead of the single shared row.
ALTER TABLE workspace_state ADD COLUMN IF NOT EXISTS workspace_id BIGINT REFERENCES workspaces (id) ON DELETE CASCADE;
UPDATE workspace_state SET workspace_id = (SELECT min(id) FROM workspaces) WHERE workspace_id IS NULL;
ALTER TABLE workspace_state DROP CONSTRAINT IF EXISTS workspace_state_pkey;
ALTER TABLE workspace_state DROP COLUMN IF EXISTS id;
ALTER TABLE workspace_state ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE workspace_state ADD PRIMARY KEY (workspace_id);

-- Audit entries keep their workspace for filtering, but survive the workspace being deleted.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS workspace_id BIGINT REFERENCES workspaces (id) ON DELETE SET NULL;
UPDATE audit_log SET workspace_id = (SELECT min(id) FROM workspaces) WHERE workspace_id IS NULL;
CREATE INDEX IF NOT EXISTS audit_log_workspace_idx ON audit_log (workspace_id, at DESC);
