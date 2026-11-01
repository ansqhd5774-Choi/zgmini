-- R41 candidate schema: do not apply to production until D1 backup, access
-- validation and explicit cutover gate pass. No R1 snapshot rows are touched.
CREATE TABLE IF NOT EXISTS iran_news_article_metadata_r41 (
 article_id TEXT PRIMARY KEY NOT NULL CHECK(length(article_id)=64),
 source_id TEXT NOT NULL CHECK(source_id IN (
  'tasnim','govuk','guardian-iran','dw-world','bbc-middle-east','aljazeera','un-middle-east'
 )),
 source TEXT NOT NULL,
 source_url TEXT NOT NULL UNIQUE CHECK(source_url LIKE 'https://%'),
 title TEXT NOT NULL CHECK(length(title)>0 AND length(title)<=500),
 published_at TEXT NOT NULL,
 body_verified INTEGER NOT NULL DEFAULT 1 CHECK(body_verified=1),
 keywords_verified INTEGER NOT NULL DEFAULT 1 CHECK(keywords_verified=1),
 checked_at INTEGER NOT NULL CHECK(checked_at>0),
 stored_at INTEGER NOT NULL CHECK(stored_at>0)
);
CREATE INDEX IF NOT EXISTS idx_iran_news_r41_published_at
 ON iran_news_article_metadata_r41(published_at DESC,article_id);
