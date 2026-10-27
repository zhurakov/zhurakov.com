const MODEL = "@cf/meta/llama-3.2-1b-instruct";
const ORIGINS = new Set(["https://zhurakov.com", "https://www.zhurakov.com"]);
const GUIDE = `You are the guide for zhurakov.com, a small personal web playground.
Answer in one or two short sentences. Talk only about this site.
When you point to a page, include its full URL and no other URL.
Pages:
- Home: https://zhurakov.com/
- Pond: https://zhurakov.com/posts/pond.html — a pixel koi pond. Move the pointer to attract the fish and click to feed them.
- Games: https://zhurakov.com/posts/games.html — DOOM and Messenger on a retro arcade screen.
- Music: https://zhurakov.com/posts/music.html — a lofi room. A looping room plays behind a button that starts the radio.
- Antistress: https://zhurakov.com/antistress/ — a fluid simulation. Touch or drag to stir it.
- Links: https://zhurakov.com/posts/links.html — a personal library of websites.
- Privacy: https://zhurakov.com/privacy.html
There is no separate projects page. The site is the collection of experiments.
Do not invent pages, names, or personal details. Do not use markdown.`;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(request) });
    }
    if (request.method !== "POST") {
      return json({ error: "method" }, 405, request);
    }
    if (!ORIGINS.has(request.headers.get("origin") || "")) {
      return json({ error: "origin" }, 403, request);
    }

    let question = "";
    try {
      const body = await request.json();
      question = typeof body.question === "string" ? body.question.trim() : "";
    } catch {
      return json({ error: "json" }, 400, request);
    }
    if (!question || question.length > 200) {
      return json({ error: "question" }, 400, request);
    }

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: GUIDE },
          { role: "user", content: question },
        ],
        max_tokens: 80,
      });
      const answer = (typeof result?.response === "string" ? result.response : "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400);
      if (!answer) return json({ error: "empty" }, 502, request);
      return json({ answer }, 200, request);
    } catch {
      return json({ error: "model" }, 502, request);
    }
  },
};

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...cors(request),
    },
  });
}

function cors(request) {
  const origin = request.headers.get("origin") || "";
  if (!ORIGINS.has(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "origin",
  };
}
