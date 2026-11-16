DELETE FROM ram_rush_scores
WHERE id NOT IN (
  SELECT MIN(id) FROM ram_rush_scores GROUP BY session_id
);

DELETE FROM ram_rush_events
WHERE event_name = 'game_start'
  AND id NOT IN (
    SELECT MIN(id) FROM ram_rush_events
    WHERE event_name = 'game_start'
    GROUP BY session_id
  );

CREATE UNIQUE INDEX IF NOT EXISTS ram_rush_scores_one_session
  ON ram_rush_scores (session_id);

CREATE UNIQUE INDEX IF NOT EXISTS ram_rush_events_one_start
  ON ram_rush_events (session_id)
  WHERE event_name = 'game_start';
