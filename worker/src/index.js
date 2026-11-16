const ORIGINS = new Set(["https://zhurakov.com", "https://www.zhurakov.com"]);
const GAME_API = "/api/ram-rush";
const EVENT_NAMES = new Set(["game_start", "share_click"]);
const MAX_POINTS_PER_SECOND = 2000;
const SCORE_GRACE = 2500;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(GAME_API)) return handleRamRush(request, env, ctx, url);
    return json({ error: "route" }, 404, request);
  },
};

async function handleRamRush(request, env, ctx, url) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (!isAllowedOrigin(request)) return json({ error: "origin" }, 403, request);
  if (request.method === "GET" && url.pathname === `${GAME_API}/leaderboard`) return json({ leaderboard: await leaderboard(env) }, 200, request);
  if (request.method !== "POST") return json({ error: "method" }, 405, request);

  const body = await readJson(request);
  if (!body) return json({ error: "json" }, 400, request);
  if (!validSession(body.sessionId)) return json({ error: "session" }, 400, request);
  const sessionId = body.sessionId;

  if (url.pathname === `${GAME_API}/events`) {
    if (!EVENT_NAMES.has(body.event)) return json({ error: "event" }, 400, request);
    if (body.event === "game_start") {
      try {
        await env.RAM_RUSH_DB.prepare("INSERT OR IGNORE INTO ram_rush_events (event_name, session_id) VALUES ('game_start', ?)").bind(sessionId).run();
      } catch (error) {
        console.error(JSON.stringify({ event: "ram_rush_event_error", message: error instanceof Error ? error.message : "unknown" }));
        return json({ error: "storage" }, 503, request);
      }
      return json({ ok: true }, 202, request);
    }
    ctx.waitUntil(recordEvent(env, body.event, sessionId));
    return json({ ok: true }, 202, request);
  }

  if (url.pathname === `${GAME_API}/score`) {
    const playerName = normalizeName(body.name);
    const score = Number(body.score);
    if (!playerName || !Number.isInteger(score) || score < 0 || score > 10000000) return json({ error: "score" }, 400, request);
    const start = await env.RAM_RUSH_DB.prepare("SELECT created_at FROM ram_rush_events WHERE event_name = 'game_start' AND session_id = ? ORDER BY id ASC LIMIT 1").bind(sessionId).first();
    const elapsed = start ? elapsedMs(start.created_at) : NaN;
    if (!Number.isFinite(elapsed) || score > maxPlausibleScore(elapsed)) return json({ error: "score" }, 400, request);
    const rankName = rankFor(score);
    const loadLevel = loadLevelFor(score);
    try {
      await env.RAM_RUSH_DB.batch([
        env.RAM_RUSH_DB.prepare("INSERT INTO ram_rush_scores (player_name, score, rank_name, load_level, session_id) VALUES (?, ?, ?, ?, ?)").bind(playerName, score, rankName, loadLevel, sessionId),
        env.RAM_RUSH_DB.prepare("INSERT INTO ram_rush_events (event_name, session_id, score) VALUES (?, ?, ?)").bind("game_over", sessionId, score),
      ]);
      console.log(JSON.stringify({ event: "ram_rush_score", score, loadLevel }));
      return json({ leaderboard: await leaderboard(env) }, 201, request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      if (/UNIQUE/i.test(message)) return json({ error: "session" }, 409, request);
      console.error(JSON.stringify({ event: "ram_rush_score_error", message }));
      return json({ error: "storage" }, 503, request);
    }
  }
  return json({ error: "route" }, 404, request);
}

async function leaderboard(env) {
  const result = await env.RAM_RUSH_DB.prepare("SELECT player_name AS name, score, rank_name AS rank, load_level AS load FROM ram_rush_scores ORDER BY score DESC, id ASC LIMIT 10").all();
  return result.results;
}

async function recordEvent(env, eventName, sessionId) {
  try { await env.RAM_RUSH_DB.prepare("INSERT INTO ram_rush_events (event_name, session_id) VALUES (?, ?)").bind(eventName, sessionId).run(); console.log(JSON.stringify({ event: eventName })); }
  catch (error) { console.error(JSON.stringify({ event: "ram_rush_event_error", message: error instanceof Error ? error.message : "unknown" })); }
}

function rankFor(score) {
  if (score >= 12000) return "RAM LEGEND";
  if (score >= 6500) return "SERVER HERO";
  if (score >= 2600) return "OPERATOR";
  return "INTERN";
}

function loadLevelFor(score) {
  return Math.min(5, 1 + Math.floor(score / 1200));
}

function elapsedMs(createdAt) {
  return Date.now() - Date.parse(`${String(createdAt).replace(" ", "T")}Z`);
}

function maxPlausibleScore(elapsed) {
  return Math.floor(Math.max(0, elapsed) / 1000) * MAX_POINTS_PER_SECOND + SCORE_GRACE;
}

async function readJson(request) { try { return await request.json(); } catch { return null; } }
function normalizeName(value) { const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""; return /^[A-Za-z0-9][A-Za-z0-9 _-]{1,15}$/.test(name) ? name : ""; }
function validSession(value) { return typeof value === "string" && /^[a-z0-9-]{16,64}$/i.test(value); }
function isAllowedOrigin(request) { const origin = request.headers.get("origin"); return !origin || ORIGINS.has(origin); }
function json(data, status, request) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cors(request) } }); }
function cors(request) {
  const origin = request.headers.get("origin") || "";
  return ORIGINS.has(origin) ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" } : {};
}
