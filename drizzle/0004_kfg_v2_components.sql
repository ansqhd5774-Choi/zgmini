CREATE TABLE kfg_v2_component_history (
  component_id TEXT NOT NULL,
  date TEXT NOT NULL,
  score REAL,
  captured_at TEXT NOT NULL,
  PRIMARY KEY(component_id, date)
);
CREATE INDEX kfg_v2_component_history_date ON kfg_v2_component_history(date DESC);
