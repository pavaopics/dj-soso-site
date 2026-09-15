CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'thumbnail', 'pdf')),
  title TEXT,
  description TEXT,
  r2_key TEXT NOT NULL,
  poster_r2_key TEXT,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'archived', 'deleted')),
  original_filename TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '3/4' CHECK (aspect_ratio IN ('9/16', '3/4', '1/1', '16/9')),
  width INTEGER,
  height INTEGER,
  duration_seconds REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_items_type_status_order
ON media_items (type, status, display_order);

CREATE TABLE IF NOT EXISTS section_content (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  title TEXT,
  eyebrow TEXT,
  body TEXT,
  cta_label TEXT,
  cta_href TEXT,
  image_media_id TEXT,
  image_alt TEXT,
  image_position TEXT NOT NULL DEFAULT '50% 50%',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (image_media_id) REFERENCES media_items(id)
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS upload_sessions (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'thumbnail', 'pdf')),
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'committed', 'expired', 'aborted')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  committed_at TEXT,
  FOREIGN KEY (media_id) REFERENCES media_items(id)
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_status_expires
ON upload_sessions (status, expires_at);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_settings (key, value) VALUES ('content_source', 'local');
INSERT OR IGNORE INTO schema_migrations (version) VALUES ('0001_initial');
