CREATE TABLE kfg_v2_research_snapshots (
  date TEXT PRIMARY KEY NOT NULL REFERENCES kfg_v2_market_dates(date),
  methodology_version TEXT NOT NULL,
  factors_json TEXT NOT NULL,
  composite_json TEXT NOT NULL,
  history_mode TEXT NOT NULL,
  point_in_time_verified INTEGER NOT NULL CHECK(point_in_time_verified IN (0,1)),
  historical_vintage_verified INTEGER NOT NULL CHECK(historical_vintage_verified IN (0,1)),
  source_published_at TEXT,
  source_observed_at TEXT NOT NULL,
  fetched_at TEXT,
  calculated_at TEXT NOT NULL,
  correction_fingerprint TEXT
);
CREATE INDEX kfg_v2_research_snapshots_latest ON kfg_v2_research_snapshots(date DESC);
