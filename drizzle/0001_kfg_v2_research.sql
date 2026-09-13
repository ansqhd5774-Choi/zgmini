CREATE TABLE kfg_v2_market_dates (
  date TEXT PRIMARY KEY NOT NULL CHECK(length(date) = 8 AND date NOT GLOB '*[^0-9]*'),
  status TEXT NOT NULL CHECK(status IN ('COMPLETE', 'NO_TRADING_OBSERVATION')),
  universe_count INTEGER NOT NULL CHECK(universe_count >= 0),
  kospi_count INTEGER NOT NULL, kosdaq_count INTEGER NOT NULL,
  valid_return_count INTEGER NOT NULL, valid_trading_value_count INTEGER NOT NULL,
  valid_market_cap_count INTEGER NOT NULL,
  return_coverage REAL, trading_value_coverage REAL, market_cap_coverage REAL,
  rows_stored INTEGER NOT NULL CHECK(rows_stored = universe_count),
  provider TEXT NOT NULL,
  methodology_version TEXT NOT NULL CHECK(methodology_version = 'KFG_RESEARCH_V2'),
  rows_received INTEGER NOT NULL, total_count INTEGER NOT NULL,
  konex_excluded INTEGER NOT NULL, duplicate_count INTEGER NOT NULL,
  fetched_at TEXT, request_count INTEGER NOT NULL CHECK(request_count >= 0)
);
--> statement-breakpoint
CREATE TABLE kfg_v2_market_rows (
  date TEXT NOT NULL REFERENCES kfg_v2_market_dates(date) DEFERRABLE INITIALLY DEFERRED,
  security_id TEXT NOT NULL, short_code TEXT NOT NULL,
  market TEXT NOT NULL CHECK(market IN ('KOSPI', 'KOSDAQ')),
  close REAL, return_pct REAL, trading_value REAL, market_cap REAL,
  PRIMARY KEY(date, security_id)
);
--> statement-breakpoint
CREATE INDEX kfg_v2_security_date ON kfg_v2_market_rows(security_id, date);
--> statement-breakpoint
CREATE TABLE kfg_v2_factor_snapshots (
  factor TEXT NOT NULL CHECK(factor = 'Breadth'),
  date TEXT NOT NULL REFERENCES kfg_v2_market_dates(date),
  score REAL NOT NULL CHECK(score BETWEEN 0 AND 100),
  status TEXT NOT NULL CHECK(status = 'VALID'),
  advance_ratio REAL NOT NULL CHECK(advance_ratio BETWEEN 0 AND 1),
  advance_value_share REAL NOT NULL CHECK(advance_value_share BETWEEN 0 AND 1),
  PRIMARY KEY(factor, date)
);
--> statement-breakpoint
CREATE TABLE kfg_v2_backfill_progress (
  methodology_version TEXT PRIMARY KEY NOT NULL CHECK(methodology_version = 'KFG_RESEARCH_V2'),
  anchor_date TEXT NOT NULL DEFAULT '20260910' CHECK(anchor_date = '20260910'),
  latest_processed_date TEXT, oldest_processed_date TEXT,
  successful_trading_date_count INTEGER NOT NULL DEFAULT 0 CHECK(successful_trading_date_count >= 0),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK(request_count >= 0),
  rows_processed INTEGER NOT NULL DEFAULT 0 CHECK(rows_processed >= 0),
  status TEXT NOT NULL DEFAULT 'IDLE' CHECK(status IN ('IDLE','RUNNING','PAUSED','COMPLETE','ERROR')),
  last_attempted_date TEXT, last_successful_date TEXT, last_failure_code TEXT,
  active_run_id TEXT, lease_until INTEGER
);
