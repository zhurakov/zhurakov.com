CREATE TABLE IF NOT EXISTS ram_rush_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  rank_name TEXT NOT NULL,
  load_level INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ram_rush_scores_leaderboard
  ON ram_rush_scores (score DESC, id ASC);

CREATE TABLE IF NOT EXISTS ram_rush_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  score INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ram_rush_events_by_name_time
  ON ram_rush_events (event_name, created_at DESC);
