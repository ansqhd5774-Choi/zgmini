-- BRANCH-ONLY proposal. Do not execute against production without explicit approval.
CREATE TABLE IF NOT EXISTS community_chat_messages (
 id TEXT PRIMARY KEY NOT NULL,
 nickname TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at TEXT NOT NULL,
 hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_community_chat_recent ON community_chat_messages(created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS community_chat_rate_limits (
 actor_hash TEXT PRIMARY KEY NOT NULL,
 minute_bucket INTEGER NOT NULL,
 minute_count INTEGER NOT NULL,
 day_bucket INTEGER NOT NULL,
 day_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS community_chat_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL, actor_hash TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(message_id,actor_hash));
CREATE INDEX IF NOT EXISTS idx_community_chat_reports_actor_date ON community_chat_reports(actor_hash,created_at);
