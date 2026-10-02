-- SOURCE ONLY drizzle/0000_stormy_miek.sql:1; live definition NOT_PROVEN
CREATE TABLE `favorite_sentiments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`item_key` text NOT NULL,
	`item_type` text NOT NULL,
	`item_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- SOURCE ONLY drizzle/0000_stormy_miek.sql:10; live definition NOT_PROVEN
CREATE UNIQUE INDEX `idx_favorite_sentiments_user_item` ON `favorite_sentiments` (`user_id`,`item_key`);

-- SOURCE ONLY drizzle/0000_stormy_miek.sql:11; live definition NOT_PROVEN
CREATE INDEX `idx_favorite_sentiments_user_created` ON `favorite_sentiments` (`user_id`,`created_at`);

-- SOURCE ONLY drizzle/0001_kfg_v2_research.sql:1; live definition NOT_PROVEN
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

-- SOURCE ONLY drizzle/0001_kfg_v2_research.sql:17; live definition NOT_PROVEN
CREATE TABLE kfg_v2_market_rows (
  date TEXT NOT NULL REFERENCES kfg_v2_market_dates(date) DEFERRABLE INITIALLY DEFERRED,
  security_id TEXT NOT NULL, short_code TEXT NOT NULL,
  market TEXT NOT NULL CHECK(market IN ('KOSPI', 'KOSDAQ')),
  close REAL, return_pct REAL, trading_value REAL, market_cap REAL,
  PRIMARY KEY(date, security_id)
);

-- SOURCE ONLY drizzle/0001_kfg_v2_research.sql:25; live definition NOT_PROVEN
CREATE INDEX kfg_v2_security_date ON kfg_v2_market_rows(security_id, date);

-- SOURCE ONLY drizzle/0001_kfg_v2_research.sql:27; live definition NOT_PROVEN
CREATE TABLE kfg_v2_factor_snapshots (
  factor TEXT NOT NULL CHECK(factor = 'Breadth'),
  date TEXT NOT NULL REFERENCES kfg_v2_market_dates(date),
  score REAL NOT NULL CHECK(score BETWEEN 0 AND 100),
  status TEXT NOT NULL CHECK(status = 'VALID'),
  advance_ratio REAL NOT NULL CHECK(advance_ratio BETWEEN 0 AND 1),
  advance_value_share REAL NOT NULL CHECK(advance_value_share BETWEEN 0 AND 1),
  PRIMARY KEY(factor, date)
);

-- SOURCE ONLY drizzle/0001_kfg_v2_research.sql:37; live definition NOT_PROVEN
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

-- SOURCE ONLY drizzle/0002_kfg_v2_incremental_read.sql:2; live definition NOT_PROVEN
CREATE INDEX kfg_v2_date_security ON kfg_v2_market_rows(date, security_id);

-- SOURCE ONLY drizzle/0003_kfg_v2_snapshots.sql:1; live definition NOT_PROVEN
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

-- SOURCE ONLY drizzle/0003_kfg_v2_snapshots.sql:15; live definition NOT_PROVEN
CREATE INDEX kfg_v2_research_snapshots_latest ON kfg_v2_research_snapshots(date DESC);

-- SOURCE ONLY drizzle/0004_kfg_v2_components.sql:1; live definition NOT_PROVEN
CREATE TABLE kfg_v2_component_history (
  component_id TEXT NOT NULL,
  date TEXT NOT NULL,
  score REAL,
  captured_at TEXT NOT NULL,
  PRIMARY KEY(component_id, date)
);

-- SOURCE ONLY drizzle/0004_kfg_v2_components.sql:8; live definition NOT_PROVEN
CREATE INDEX kfg_v2_component_history_date ON kfg_v2_component_history(date DESC);

-- SOURCE ONLY drizzle/0005_kfg_rev7_foundation.sql:1; live definition NOT_PROVEN
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

-- SOURCE ONLY drizzle/0005_kfg_rev7_foundation.sql:15; live definition NOT_PROVEN
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

-- SOURCE ONLY drizzle/0005_kfg_rev7_foundation.sql:27; live definition NOT_PROVEN
CREATE INDEX kfg_rev7_security_date ON kfg_rev7_kospi_rows(security_id, date);

-- SOURCE ONLY drizzle/0005_kfg_rev7_foundation.sql:29; live definition NOT_PROVEN
CREATE INDEX kfg_rev7_date_security ON kfg_rev7_kospi_rows(date, security_id);

-- SOURCE ONLY drizzle/0005_kfg_rev7_foundation.sql:31; live definition NOT_PROVEN
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

-- SOURCE ONLY drizzle/0005_kfg_rev7_foundation.sql:46; live definition NOT_PROVEN
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

-- SOURCE ONLY drizzle/0005_kfg_rev7_foundation.sql:57; live definition NOT_PROVEN
CREATE INDEX kfg_rev7_snapshots_latest ON kfg_rev7_snapshots(date DESC);

-- SOURCE ONLY drizzle/0005_kfg_rev7_foundation.sql:59; live definition NOT_PROVEN
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

-- SOURCE ONLY drizzle/0006_c1_r3_foundation.sql:1; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS c1_r3_candidate_scores_v1 (
  revision TEXT NOT NULL,
  score_date TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  score REAL NOT NULL,
  observation_date TEXT,
  computed_at TEXT NOT NULL,
  source_snapshot_sha256 TEXT,
  PRIMARY KEY(revision,score_date,candidate_id)
);

-- SOURCE ONLY drizzle/0006_c1_r3_foundation.sql:12; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS c1_r3_candidate_scores_lookup_v1 ON c1_r3_candidate_scores_v1(revision,score_date DESC);

-- SOURCE ONLY lib/market-score/breadth-b1-r3-history-ingest-r2.mjs:20; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_semantic_v1(
    trade_date TEXT PRIMARY KEY,
    previous_date TEXT NOT NULL,
    semantic_contract TEXT NOT NULL,
    semantic_schema TEXT NOT NULL,
    semantic_sha256 TEXT NOT NULL,
    member_count INTEGER NOT NULL,
    pair_count INTEGER NOT NULL,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );

-- SOURCE ONLY lib/market-score/breadth-b1-r3-history-ingest-r2.mjs:31; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_breadth_b1_r3_semantic_hash_v1
    ON market_score_breadth_b1_r3_semantic_v1(semantic_sha256);

-- SOURCE ONLY lib/market-score/breadth-b1-r3-store.mjs:19; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_current_v1(
        trade_date TEXT NOT NULL,ticker TEXT NOT NULL,previous_date TEXT NOT NULL,
        previous_close REAL NOT NULL,current_close REAL NOT NULL,current_volume REAL NOT NULL,
        source TEXT NOT NULL,feed TEXT,provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,retrieved_at TEXT NOT NULL,last_as_of_date TEXT NOT NULL,
        PRIMARY KEY(trade_date,ticker));

-- SOURCE ONLY lib/market-score/breadth-b1-r3-store.mjs:25; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_breadth_b1_r3_current_date_v1
        ON market_score_breadth_b1_r3_current_v1(trade_date DESC,ticker);

-- SOURCE ONLY lib/market-score/breadth-b1-r3-store.mjs:27; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_history_v1(
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,trade_date TEXT NOT NULL,ticker TEXT NOT NULL,previous_date TEXT NOT NULL,
        previous_close REAL NOT NULL,current_close REAL NOT NULL,current_volume REAL NOT NULL,
        source TEXT NOT NULL,feed TEXT,provenance_json TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN('INSERT','UPDATE')),retrieved_at TEXT NOT NULL,as_of_date TEXT NOT NULL);

-- SOURCE ONLY lib/market-score/breadth-b1-r3-store.mjs:32; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_breadth_b1_r3_history_date_v1
        ON market_score_breadth_b1_r3_history_v1(trade_date,ticker,history_id);

-- SOURCE ONLY lib/market-score/breadth-b1-r3-store.mjs:34; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_universe_v1(
        trade_date TEXT PRIMARY KEY,members_json TEXT NOT NULL,member_count INTEGER NOT NULL,provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,retrieved_at TEXT NOT NULL);

-- SOURCE ONLY lib/market-score/breadth-b1-r3-store.mjs:37; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_runs_v1(
        run_id TEXT PRIMARY KEY,as_of_date TEXT NOT NULL,trade_date TEXT,status TEXT NOT NULL,started_at TEXT NOT NULL,completed_at TEXT NOT NULL,
        provider_requests INTEGER NOT NULL DEFAULT 0,collected_rows INTEGER NOT NULL DEFAULT 0,inserted_count INTEGER NOT NULL DEFAULT 0,
        updated_count INTEGER NOT NULL DEFAULT 0,noop_count INTEGER NOT NULL DEFAULT 0,current_rows INTEGER NOT NULL DEFAULT 0,
        history_rows_added INTEGER NOT NULL DEFAULT 0,coverage REAL,upstream_ms REAL,storage_write_ms REAL,failure_code TEXT,detail_json TEXT NOT NULL);

-- SOURCE ONLY lib/market-score/breadth-b1-r3-store.mjs:42; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_breadth_b1_r3_runs_time_v1
        ON market_score_breadth_b1_r3_runs_v1(as_of_date,completed_at DESC);

-- SOURCE ONLY lib/market-score/breadth-b1-r3-store.mjs:44; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_lock_v1(lock_key TEXT PRIMARY KEY,token TEXT NOT NULL,expires_at TEXT NOT NULL);

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store-r2.mjs:45; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_r2_current_v1 (
        provider TEXT NOT NULL,
        observation_key TEXT NOT NULL,
        observation_date TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT,
        provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        last_as_of_date TEXT NOT NULL,
        PRIMARY KEY(provider,observation_key,entity_type,entity_id,metric)
      );

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store-r2.mjs:61; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_breadth_r2_current_obs_v1
        ON market_score_breadth_r2_current_v1(provider,observation_date DESC,observation_key,metric,entity_id);

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store-r2.mjs:63; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_r2_history_v1 (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        observation_key TEXT NOT NULL,
        observation_date TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT,
        provenance_json TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN ('INSERT','UPDATE')),
        retrieved_at TEXT NOT NULL,
        as_of_date TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store-r2.mjs:78; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_breadth_r2_history_obs_v1
        ON market_score_breadth_r2_history_v1(provider,observation_key,metric,entity_id,history_id);

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store-r2.mjs:80; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_r2_universe_v1 (
        universe_key TEXT NOT NULL,
        observation_key TEXT NOT NULL,
        observation_date TEXT NOT NULL,
        body_json TEXT NOT NULL,
        member_count INTEGER NOT NULL,
        provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        PRIMARY KEY(universe_key,observation_key)
      );

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store-r2.mjs:92; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_breadth_r2_universe_obs_v1
        ON market_score_breadth_r2_universe_v1(universe_key,observation_date DESC,observation_key);

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store-r2.mjs:94; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_r2_runs_v1 (
        run_id TEXT PRIMARY KEY,
        as_of_date TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        provider_requests INTEGER NOT NULL DEFAULT 0,
        collected_rows INTEGER NOT NULL DEFAULT 0,
        inserted_count INTEGER NOT NULL DEFAULT 0,
        updated_count INTEGER NOT NULL DEFAULT 0,
        noop_count INTEGER NOT NULL DEFAULT 0,
        current_rows INTEGER NOT NULL DEFAULT 0,
        history_rows_added INTEGER NOT NULL DEFAULT 0,
        upstream_ms REAL,
        storage_write_ms REAL,
        storage_read_ms REAL,
        score_compute_ms REAL,
        failure_code TEXT,
        detail_json TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store-r2.mjs:114; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_breadth_r2_runs_time_v1
        ON market_score_breadth_r2_runs_v1(as_of_date,completed_at DESC);

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store-r2.mjs:116; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_r2_lock_v1 (
        lock_key TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store.mjs:67; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_r2_raw_v1 (
        content_hash TEXT PRIMARY KEY,
        source_key TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        first_retrieved_at TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store.mjs:74; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_r2_event_v1 (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_key TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        event_type TEXT NOT NULL,
        FOREIGN KEY(content_hash) REFERENCES market_score_breadth_r2_raw_v1(content_hash)
      );

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store.mjs:83; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_breadth_r2_event_source_time_v1
        ON market_score_breadth_r2_event_v1(source_key, retrieved_at DESC, event_id DESC);

-- SOURCE ONLY lib/market-score/breadth-r2-d1-store.mjs:86; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_r2_snapshot_v1 (
        cache_key TEXT PRIMARY KEY,
        body_json TEXT NOT NULL,
        cached_at TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/breadth-r2-lease-r1.mjs:32; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_breadth_r2_lock_v1 (
      lock_key TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

-- SOURCE ONLY lib/market-score/earnings-e1-r3-d1-store.mjs:28; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_current_v1 (
        period_end TEXT NOT NULL,
        cik TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        ticker TEXT,
        company_name TEXT,
        frame TEXT NOT NULL,
        prior_frame TEXT,
        provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        PRIMARY KEY(period_end,cik,metric)
      );

-- SOURCE ONLY lib/market-score/earnings-e1-r3-d1-store.mjs:43; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_earnings_e1_r3_current_period_metric_v1
        ON market_score_earnings_e1_r3_current_v1(period_end,metric,cik);

-- SOURCE ONLY lib/market-score/earnings-e1-r3-d1-store.mjs:45; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_history_v1 (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_end TEXT NOT NULL,
        cik TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        ticker TEXT,
        company_name TEXT,
        frame TEXT NOT NULL,
        prior_frame TEXT,
        provenance_json TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN ('INSERT','UPDATE')),
        retrieved_at TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/earnings-e1-r3-d1-store.mjs:59; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_earnings_e1_r3_history_period_metric_v1
        ON market_score_earnings_e1_r3_history_v1(period_end,metric,cik,history_id);

-- SOURCE ONLY lib/market-score/earnings-e1-r3-d1-store.mjs:61; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_earnings_e1_r3_history_cik_metric_v1
        ON market_score_earnings_e1_r3_history_v1(cik,metric,period_end,history_id);

-- SOURCE ONLY lib/market-score/earnings-e1-r3-d1-store.mjs:63; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_universe_v1 (
        period_end TEXT PRIMARY KEY,
        body_json TEXT NOT NULL,
        security_count INTEGER NOT NULL,
        issuer_count INTEGER NOT NULL,
        wikipedia_revision_id TEXT,
        retrieved_at TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/earnings-e1-r3-d1-store.mjs:71; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_runs_v1 (
        run_id TEXT PRIMARY KEY,
        period_end TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        universe_count INTEGER NOT NULL DEFAULT 0,
        provider_requests INTEGER NOT NULL DEFAULT 0,
        eps_count INTEGER NOT NULL DEFAULT 0,
        revenue_count INTEGER NOT NULL DEFAULT 0,
        margin_count INTEGER NOT NULL DEFAULT 0,
        inserted_count INTEGER NOT NULL DEFAULT 0,
        updated_count INTEGER NOT NULL DEFAULT 0,
        noop_count INTEGER NOT NULL DEFAULT 0,
        current_rows INTEGER NOT NULL DEFAULT 0,
        history_rows_added INTEGER NOT NULL DEFAULT 0,
        upstream_ms REAL,
        storage_write_ms REAL,
        storage_read_ms REAL,
        score_compute_ms REAL,
        failure_code TEXT
      );

-- SOURCE ONLY lib/market-score/earnings-e1-r3-d1-store.mjs:93; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_earnings_e1_r3_runs_period_time_v1
        ON market_score_earnings_e1_r3_runs_v1(period_end,completed_at DESC);

-- SOURCE ONLY lib/market-score/earnings-e1-r3-d1-store.mjs:95; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_lock_v1 (
        lock_key TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/employment-r4-shadow-store.mjs:110; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_employment_r4_shadow_current_v1 (
        logical_series_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_series_id TEXT NOT NULL,
        geography_type TEXT NOT NULL,
        geography_code TEXT NOT NULL,
        frequency TEXT NOT NULL,
        unit TEXT,
        seasonal_adjustment TEXT,
        population_coverage TEXT,
        observation_date TEXT NOT NULL,
        release_date TEXT,
        available_at TEXT,
        retrieved_at TEXT NOT NULL,
        value REAL NOT NULL,
        source_revision TEXT,
        source_hash TEXT NOT NULL,
        quality_status TEXT NOT NULL,
        pit_class TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        PRIMARY KEY(logical_series_id,geography_type,geography_code,observation_date)
      );

-- SOURCE ONLY lib/market-score/employment-r4-shadow-store.mjs:135; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_employment_r4_shadow_current_lookup_v1
        ON market_score_employment_r4_shadow_current_v1(logical_series_id,observation_date DESC,geography_type,geography_code);

-- SOURCE ONLY lib/market-score/employment-r4-shadow-store.mjs:137; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_employment_r4_shadow_history_v1 (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        logical_series_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_series_id TEXT NOT NULL,
        geography_type TEXT NOT NULL,
        geography_code TEXT NOT NULL,
        frequency TEXT NOT NULL,
        unit TEXT,
        seasonal_adjustment TEXT,
        population_coverage TEXT,
        observation_date TEXT NOT NULL,
        release_date TEXT,
        available_at TEXT,
        retrieved_at TEXT NOT NULL,
        value REAL NOT NULL,
        source_revision TEXT,
        source_hash TEXT NOT NULL,
        quality_status TEXT NOT NULL,
        pit_class TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        provenance_json TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN ('INSERT','UPDATE')),
        recorded_at TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/employment-r4-shadow-store.mjs:162; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_employment_r4_shadow_history_lookup_v1
        ON market_score_employment_r4_shadow_history_v1(logical_series_id,geography_type,geography_code,observation_date,history_id);

-- SOURCE ONLY lib/market-score/employment-r4-shadow-store.mjs:164; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_employment_r4_shadow_runs_v1 (
        run_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        collector_revision TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        provider_requests INTEGER NOT NULL DEFAULT 0,
        collected_rows INTEGER NOT NULL DEFAULT 0,
        inserted_count INTEGER NOT NULL DEFAULT 0,
        revised_count INTEGER NOT NULL DEFAULT 0,
        noop_count INTEGER NOT NULL DEFAULT 0,
        rejected_count INTEGER NOT NULL DEFAULT 0,
        partial_count INTEGER NOT NULL DEFAULT 0,
        current_rows INTEGER NOT NULL DEFAULT 0,
        history_rows_added INTEGER NOT NULL DEFAULT 0,
        failure_code TEXT,
        detail_json TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/employment-r4-shadow-store.mjs:183; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_employment_r4_shadow_runs_time_v1
        ON market_score_employment_r4_shadow_runs_v1(completed_at DESC,status);

-- SOURCE ONLY lib/market-score/employment-r4-shadow-store.mjs:185; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_employment_r4_shadow_lock_v1 (
        lock_key TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/employment-r6-store.mjs:61; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_employment_r6_raw_snapshot_v1 (
        snapshot_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_count INTEGER NOT NULL,
        release_group TEXT NOT NULL,
        provider TEXT NOT NULL,
        request_key TEXT NOT NULL,
        release_at TEXT,
        retrieved_at TEXT NOT NULL,
        http_status INTEGER,
        content_type TEXT,
        body_sha256 TEXT NOT NULL,
        body_chunk TEXT NOT NULL,
        detail_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(snapshot_id,chunk_index)
      );

-- SOURCE ONLY lib/market-score/employment-r6-store.mjs:78; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_employment_r6_raw_snapshot_lookup_v1
        ON market_score_employment_r6_raw_snapshot_v1(release_group,retrieved_at DESC,request_key);

-- SOURCE ONLY lib/market-score/employment-r6-store.mjs:81; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_employment_r6_feature_history_v1 (
        feature_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_id TEXT NOT NULL,
        observation_date TEXT NOT NULL,
        score_as_of TEXT NOT NULL,
        formula_hash TEXT NOT NULL,
        feature_score REAL,
        raw_value REAL,
        status TEXT NOT NULL,
        source_hash TEXT NOT NULL,
        detail_json TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        UNIQUE(feature_id,observation_date,score_as_of,formula_hash,source_hash)
      );

-- SOURCE ONLY lib/market-score/employment-r6-store.mjs:95; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_employment_r6_feature_history_lookup_v1
        ON market_score_employment_r6_feature_history_v1(feature_id,score_as_of DESC,observation_date DESC);

-- SOURCE ONLY lib/market-score/employment-r6-store.mjs:98; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_employment_r6_read_model_v1 (
        version_id TEXT PRIMARY KEY,
        score_as_of TEXT NOT NULL,
        formula_hash TEXT NOT NULL,
        data_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        employment_score REAL,
        model_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        ready_at TEXT
      );

-- SOURCE ONLY lib/market-score/employment-r6-store.mjs:109; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS market_score_employment_r6_read_model_lookup_v1
        ON market_score_employment_r6_read_model_v1(status,score_as_of DESC,ready_at DESC);

-- SOURCE ONLY lib/market-score/employment-r6-store.mjs:112; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_employment_r6_read_pointer_v1 (
        pointer_key TEXT PRIMARY KEY,
        version_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK(pointer_key='CURRENT')
      );

-- SOURCE ONLY lib/market-score/growth-r2-d1-store-r1.mjs:39; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS growth_r2_feature_history_v1 (
        candidate_id TEXT NOT NULL, observation_date TEXT NOT NULL, observation_period TEXT,
        available_at TEXT NOT NULL, release_date TEXT, vintage_id TEXT NOT NULL,
        pit_eligible INTEGER NOT NULL, provider TEXT, selector TEXT, frequency TEXT,
        native_value REAL, native_unit TEXT, harmonized_value REAL NOT NULL, harmonized_unit TEXT,
        transform_rule TEXT, source_hash TEXT, source_url TEXT, feature_revision TEXT,
        method_revision TEXT, retrieved_at TEXT NOT NULL, record_hash TEXT NOT NULL,
        PRIMARY KEY(candidate_id,observation_date,record_hash)
      );

-- SOURCE ONLY lib/market-score/growth-r2-d1-store-r1.mjs:48; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS growth_r2_history_lookup_v1
        ON growth_r2_feature_history_v1(candidate_id,observation_date,available_at);

-- SOURCE ONLY lib/market-score/growth-r2-d1-store-r1.mjs:50; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS growth_r2_feature_current_v1 (
        candidate_id TEXT PRIMARY KEY, observation_date TEXT NOT NULL, observation_period TEXT,
        available_at TEXT NOT NULL, release_date TEXT, vintage_id TEXT NOT NULL,
        pit_eligible INTEGER NOT NULL, provider TEXT, selector TEXT, frequency TEXT,
        native_value REAL, native_unit TEXT, harmonized_value REAL NOT NULL, harmonized_unit TEXT,
        transform_rule TEXT, source_hash TEXT, source_url TEXT, feature_revision TEXT,
        method_revision TEXT, retrieved_at TEXT NOT NULL, record_hash TEXT NOT NULL
      );

-- SOURCE ONLY lib/market-score/growth-r2-d1-store-r1.mjs:58; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS growth_r2_meta_v1 (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL);

-- SOURCE ONLY lib/market-score/growth-r2-d1-store-r1.mjs:59; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS growth_r2_provider_snapshots_v1 (
        provider_group TEXT NOT NULL,snapshot_hash TEXT NOT NULL,retrieved_at TEXT NOT NULL,
        source_url TEXT,payload_json TEXT NOT NULL,PRIMARY KEY(provider_group,snapshot_hash)
      );

-- SOURCE ONLY lib/market-score/growth-r2-d1-store-r1.mjs:63; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS growth_r2_forward_stage_v1 (
        candidate_id TEXT PRIMARY KEY,stage TEXT NOT NULL,body_json TEXT NOT NULL,retrieved_at TEXT NOT NULL
      );

-- SOURCE ONLY worker/api-history-store.mjs:165; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS api_history_chunks_v1 (
        provider TEXT NOT NULL,
        dataset TEXT NOT NULL,
        chunk_sha256 TEXT NOT NULL,
        first_observation_date TEXT,
        last_observation_date TEXT,
        row_count INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        PRIMARY KEY(provider, dataset, chunk_sha256)
      );

-- SOURCE ONLY worker/api-history-store.mjs:176; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS api_history_snapshots_v1 (
        provider TEXT NOT NULL,
        dataset TEXT NOT NULL,
        snapshot_sha256 TEXT NOT NULL,
        as_of TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        status TEXT NOT NULL,
        history_mode TEXT,
        row_count INTEGER NOT NULL,
        latest_observation_date TEXT,
        chunk_hashes_json TEXT NOT NULL,
        provenance_json TEXT NOT NULL,
        PRIMARY KEY(provider, dataset, snapshot_sha256)
      );

-- SOURCE ONLY worker/api-history-store.mjs:190; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS api_history_snapshots_lookup_v1
        ON api_history_snapshots_v1(provider, dataset, retrieved_at DESC);

-- SOURCE ONLY worker/consumption-r3-operational-refresh.mjs:46; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS c1_r3_refresh_claims_v1 (
        revision TEXT NOT NULL,
        score_date TEXT NOT NULL,
        attempt_date TEXT NOT NULL,
        claim_key TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        detail TEXT,
        PRIMARY KEY(revision,score_date,attempt_date,claim_key)
      );

-- SOURCE ONLY worker/consumption-r3-operational-refresh.mjs:57; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS c1_r3_refresh_claim_lookup_v1
        ON c1_r3_refresh_claims_v1(revision,score_date,attempt_date);

-- SOURCE ONLY worker/consumption-r3-score-store.mjs:11; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS c1_r3_candidate_scores_v1 (
        revision TEXT NOT NULL,
        score_date TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        score REAL NOT NULL,
        observation_date TEXT,
        computed_at TEXT NOT NULL,
        source_snapshot_sha256 TEXT,
        PRIMARY KEY(revision,score_date,candidate_id)
      );

-- SOURCE ONLY worker/consumption-r3-score-store.mjs:21; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS c1_r3_candidate_scores_lookup_v1
        ON c1_r3_candidate_scores_v1(revision,score_date DESC);

-- SOURCE ONLY worker/consumption-r3-seed.mjs:38; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS c1_r3_candidate_scores_v1 (
      revision TEXT NOT NULL,
      score_date TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      score REAL NOT NULL,
      observation_date TEXT,
      computed_at TEXT NOT NULL,
      source_snapshot_sha256 TEXT,
      PRIMARY KEY(revision,score_date,candidate_id)
    );

-- SOURCE ONLY worker/consumption-r3-seed.mjs:48; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS c1_r3_candidate_scores_lookup_v1 ON c1_r3_candidate_scores_v1(revision,score_date DESC);

-- SOURCE ONLY worker/consumption-r3-source-store.mjs:20; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS c1_r3_source_snapshots_v1 (
        revision TEXT NOT NULL,
        score_date TEXT NOT NULL,
        quarter TEXT NOT NULL,
        source_key TEXT NOT NULL,
        provider TEXT NOT NULL,
        payload_sha256 TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        source_url TEXT,
        PRIMARY KEY(revision,score_date,source_key)
      );

-- SOURCE ONLY worker/consumption-r3-source-store.mjs:32; live definition NOT_PROVEN
CREATE INDEX IF NOT EXISTS c1_r3_source_snapshots_lookup_v1
        ON c1_r3_source_snapshots_v1(revision,score_date DESC,source_key);

-- SOURCE ONLY worker/market-operational-store.mjs:24; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_input_batches_v1 (batch_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL);

-- SOURCE ONLY worker/market-operational-store.mjs:25; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_public_snapshots_v1 (snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL);

-- SOURCE ONLY worker/market-operational-store.mjs:26; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_collection_jobs_v1 (job TEXT PRIMARY KEY,lease_id TEXT,lease_until INTEGER NOT NULL DEFAULT 0,finished_at INTEGER NOT NULL DEFAULT 0,status TEXT);

-- SOURCE ONLY worker/market-operational-store.mjs:27; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_liquidity_active_history_v1 (as_of_date TEXT NOT NULL,methodology_version TEXT NOT NULL,score REAL NOT NULL,stored_at INTEGER NOT NULL,PRIMARY KEY(as_of_date,methodology_version));

-- SOURCE ONLY worker/market-score-response-store.mjs:33; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_score_response_cache_v1 (
      cache_key TEXT PRIMARY KEY, body TEXT NOT NULL, stored_at INTEGER NOT NULL
    );

-- SOURCE ONLY worker/market-score-response-store.mjs:36; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS market_liquidity_active_history_v1 (
      as_of_date TEXT NOT NULL,
      methodology_version TEXT NOT NULL,
      score REAL NOT NULL,
      stored_at INTEGER NOT NULL,
      PRIMARY KEY(as_of_date, methodology_version)
    );

-- SOURCE ONLY worker/public-feed-store.mjs:22; live definition NOT_PROVEN
CREATE TABLE IF NOT EXISTS public_feed_snapshots_v1(kind TEXT NOT NULL,feed_key TEXT NOT NULL,snapshot_key TEXT NOT NULL,body TEXT NOT NULL,stored_at INTEGER NOT NULL,PRIMARY KEY(kind,feed_key,snapshot_key));
