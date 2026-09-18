CREATE TABLE kfg_rev7_market_dates (
  date TEXT PRIMARY KEY NOT NULL CHECK(length(date) = 8 AND date NOT GLOB '*[^0-9]*'),
  status TEXT NOT NULL CHECK(status IN ('COMPLETE', 'NO_TRADING_OBSERVATION')),
  kospi_count INTEGER NOT NULL CHECK(kospi_count >= 0),
  valid_high_count INTEGER NOT NULL CHECK(valid_high_count >= 0),
  valid_low_count INTEGER NOT NULL CHECK(valid_low_count >= 0),
  valid_share_volume_count INTEGER NOT NULL CHECK(valid_share_volume_count >= 0),
  rows_stored INTEGER NOT NULL CHECK(rows_stored = kospi_count),
  krx_request_count INTEGER NOT NULL CHECK(krx_request_count >= 0),
  bok_request_count INTEGER NOT NULL CHECK(bok_request_count >= 0),
  fetched_at TEXT,
  methodology_version TEXT NOT NULL CHECK(methodology_version = 'kr-fg-cnn-r7-1.0.0')
);
--> statement-breakpoint
CREATE TABLE kfg_rev7_kospi_rows (
  date TEXT NOT NULL REFERENCES kfg_rev7_market_dates(date) DEFERRABLE INITIALLY DEFERRED,
  security_id TEXT NOT NULL,
  short_code TEXT NOT NULL,
  close REAL,
  high REAL,
  low REAL,
  change_amount REAL,
  share_volume REAL,
  PRIMARY KEY(date, security_id)
);
--> statement-breakpoint
CREATE INDEX kfg_rev7_security_date ON kfg_rev7_kospi_rows(security_id, date);
--> statement-breakpoint
CREATE INDEX kfg_rev7_date_security ON kfg_rev7_kospi_rows(date, security_id);
--> statement-breakpoint
CREATE TABLE kfg_rev7_daily_series (
  date TEXT PRIMARY KEY NOT NULL REFERENCES kfg_rev7_market_dates(date),
  kospi_close REAL NOT NULL,
  vkospi200_close REAL NOT NULL,
  ktb_total_return REAL NOT NULL,
  government_prime_total_return REAL,
  standard_put_volume REAL NOT NULL CHECK(standard_put_volume >= 0),
  standard_call_volume REAL NOT NULL CHECK(standard_call_volume >= 0),
  put_call_ratio REAL,
  aa_minus_3y REAL,
  bbb_minus_3y REAL,
  junk_spread REAL,
  fetched_at TEXT
);
--> statement-breakpoint
CREATE TABLE kfg_rev7_snapshots (
  date TEXT PRIMARY KEY NOT NULL REFERENCES kfg_rev7_market_dates(date),
  methodology_version TEXT NOT NULL CHECK(methodology_version = 'kr-fg-cnn-r7-1.0.0'),
  factors_json TEXT NOT NULL,
  composite_json TEXT NOT NULL,
  history_mode TEXT NOT NULL CHECK(history_mode = 'RECONSTRUCTED_CURRENT_VINTAGE'),
  point_in_time_verified INTEGER NOT NULL CHECK(point_in_time_verified IN (0,1)),
  source_observed_at TEXT NOT NULL,
  calculated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX kfg_rev7_snapshots_latest ON kfg_rev7_snapshots(date DESC);
--> statement-breakpoint
CREATE TABLE kfg_rev7_backfill_progress (
  methodology_version TEXT PRIMARY KEY NOT NULL CHECK(methodology_version = 'kr-fg-cnn-r7-1.0.0'),
  anchor_date TEXT NOT NULL DEFAULT '20260915' CHECK(anchor_date = '20260915'),
  latest_processed_date TEXT,
  oldest_processed_date TEXT,
  successful_trading_date_count INTEGER NOT NULL DEFAULT 0 CHECK(successful_trading_date_count >= 0),
  krx_request_count INTEGER NOT NULL DEFAULT 0 CHECK(krx_request_count >= 0),
  bok_request_count INTEGER NOT NULL DEFAULT 0 CHECK(bok_request_count >= 0),
  rows_processed INTEGER NOT NULL DEFAULT 0 CHECK(rows_processed >= 0),
  status TEXT NOT NULL DEFAULT 'IDLE' CHECK(status IN ('IDLE','RUNNING','PAUSED','COMPLETE','ERROR')),
  last_attempted_date TEXT,
  last_successful_date TEXT,
  last_failure_code TEXT,
  active_run_id TEXT,
  lease_until INTEGER
);
