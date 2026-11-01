-- One JSON document holding the workspace's contacts, labels, templates, campaigns, workflows, sequences and settings.
CREATE TABLE IF NOT EXISTS workspace_state (
  id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data       JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
