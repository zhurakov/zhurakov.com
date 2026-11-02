const origin = "https://zhurakov.com";

export const pages = [
  {
    label: "Home",
    path: "/",
    aliases: ["/index.html"],
  },
  {
    label: "Pond",
    path: "/posts/pond.html",
    suggest: true,
    detail:
      "a pixel koi pond. Move the pointer to attract the fish and click to feed them.",
  },
  {
    label: "Games",
    path: "/posts/games.html",
    suggest: true,
    detail: "DOOM and Messenger on a retro arcade screen.",
  },
  {
    label: "Music",
    path: "/posts/music.html",
    suggest: true,
    detail:
      "a lofi room. A looping room plays behind a button that starts the radio.",
  },
  {
    label: "Antistress",
    path: "/antistress/",
    aliases: ["/antistress/index.html"],
    suggest: true,
    detail: "a fluid simulation. Touch or drag to stir it.",
  },
  {
    label: "Links",
    path: "/posts/links.html",
    suggest: true,
    detail: "a personal library of websites.",
  },
  {
    label: "Privacy",
    path: "/privacy.html",
  },
];

export const pageLabels = new Map(
  pages.flatMap((page) => [
    [page.path, page.label],
    ...(page.aliases ?? []).map((alias) => [alias, page.label]),
  ]),
);

const suggested = pages
  .filter((page) => page.suggest)
  .map((page) => page.label.toLowerCase());

export const askTopics = `${suggested.slice(0, -1).join(", ")}, or ${suggested.at(-1)}`;

const catalog = pages
  .map((page) => {
    const url = `${origin}${page.path}`;
    return page.detail
      ? `- ${page.label}: ${url} — ${page.detail}`
      : `- ${page.label}: ${url}`;
  })
  .join("\n");

export const guide = `You are the guide for zhurakov.com, a small personal web playground.
Answer in one or two short sentences. Talk only about this site.
When you point to a page, include its full URL and no other URL.
Pages:
${catalog}
There is no separate projects page. The site is the collection of experiments.
Answer in English.
If asked for a name, yours or a person's, answer exactly: This is a personal site, a collection of experiments, games, and small pages.
Do not translate words. Do not invent pages, names, or personal details. Do not use markdown.`;
