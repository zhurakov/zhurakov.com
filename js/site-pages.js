export const pages = [
  {
    label: "Pond",
    path: "/posts/pond.html",
    suggest: true,
  },
  {
    label: "Games",
    path: "/posts/games.html",
    suggest: true,
  },
  {
    label: "Music",
    path: "/posts/music.html",
    suggest: true,
  },
  {
    label: "Antistress",
    path: "/antistress/",
    suggest: true,
  },
  {
    label: "Links",
    path: "/posts/links.html",
    suggest: true,
  },
];

const suggested = pages
  .filter((page) => page.suggest)
  .map((page) => page.label.toLowerCase());

export const askTopics = `${suggested.slice(0, -1).join(", ")}, or ${suggested.at(-1)}`;
