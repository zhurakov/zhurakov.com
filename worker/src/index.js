import { guide as GUIDE } from "../../js/site-pages.js";

const MODEL = "@cf/meta/llama-3.2-1b-instruct";
const ORIGINS = new Set(["https://zhurakov.com", "https://www.zhurakov.com"]);
const GAME_API = "/api/ram-rush";
const EVENT_NAMES = new Set(["game_start", "share_click"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(GAME_API)) return handleRamRush(request, env, ctx, url);
    return handleRobot(request, env);
  },
};

async function handleRobot(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return json({ error: "method" }, 405, request);
  if (!isAllowedOrigin(request)) return json({ error: "origin" }, 403, request);
  const body = await readJson(request);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 200) return json({ error: "question" }, 400, request);
  try {
    const result = await env.AI.run(MODEL, { messages: [{ role: "system", content: GUIDE }, { role: "user", content: question }], max_tokens: 80 });
    const answer = (typeof result?.response === "string" ? result.response : "").replace(/\s+/g, " ").trim().slice(0, 400);
    return answer ? json({ answer }, 200, request) : json({ error: "empty" }, 502, request);
  } catch { return json({ error: "model" }, 502, request); }
}

async function handleRamRush(request, env, ctx, url) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (!isAllowedOrigin(request)) return json({ error: "origin" }, 403, request);
  if (request.method === "GET" && url.pathname === `${GAME_API}/leaderboard`) return json({ leaderboard: await leaderboard(env) }, 200, request);
  if (request.method !== "POST") return json({ error: "method" }, 405, request);

  const body = await readJson(request);
  if (!body) return json({ error: "json" }, 400, request);
  const sessionId = validSession(body.sessionId) ? body.sessionId : crypto.randomUUID();

  if (url.pathname === `${GAME_API}/events`) {
    if (!EVENT_NAMES.has(body.event)) return json({ error: "event" }, 400, request);
    ctx.waitUntil(recordEvent(env, body.event, sessionId));
    return json({ ok: true }, 202, request);
  }

  if (url.pathname === `${GAME_API}/score`) {
    const playerName = normalizeName(body.name);
    const score = Number(body.score), loadLevel = Number(body.load), rankName = normalizeRank(body.rank);
    if (!playerName || !Number.isInteger(score) || score < 0 || score > 10000000 || !Number.isInteger(loadLevel) || loadLevel < 1 || loadLevel > 5 || !rankName) return json({ error: "score" }, 400, request);
    try {
      await env.RAM_RUSH_DB.batch([
        env.RAM_RUSH_DB.prepare("INSERT INTO ram_rush_scores (player_name, score, rank_name, load_level, session_id) VALUES (?, ?, ?, ?, ?)").bind(playerName, score, rankName, loadLevel, sessionId),
        env.RAM_RUSH_DB.prepare("INSERT INTO ram_rush_events (event_name, session_id, score) VALUES (?, ?, ?)").bind("game_over", sessionId, score),
      ]);
      console.log(JSON.stringify({ event: "ram_rush_score", score, loadLevel }));
      return json({ leaderboard: await leaderboard(env) }, 201, request);
    } catch (error) {
      console.error(JSON.stringify({ event: "ram_rush_score_error", message: error instanceof Error ? error.message : "unknown" }));
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

async function readJson(request) { try { return await request.json(); } catch { return null; } }
function normalizeName(value) { const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""; return /^[A-Za-z0-9][A-Za-z0-9 _-]{1,15}$/.test(name) ? name : ""; }
function normalizeRank(value) { return ["INTERN", "OPERATOR", "SERVER HERO", "RAM LEGEND"].includes(value) ? value : ""; }
function validSession(value) { return typeof value === "string" && /^[a-z0-9-]{16,64}$/i.test(value); }
function isAllowedOrigin(request) { const origin = request.headers.get("origin"); return !origin || ORIGINS.has(origin); }
function json(data, status, request) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cors(request) } }); }
function cors(request) {
  const origin = request.headers.get("origin") || "";
  return ORIGINS.has(origin) ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" } : {};
}
