-- Supports newest-first daily-window reads for Research V2 without changing stored data.
CREATE INDEX kfg_v2_date_security ON kfg_v2_market_rows(date, security_id);
