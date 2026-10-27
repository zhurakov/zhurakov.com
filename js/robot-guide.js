import { robotRenderer } from "./robot-motion.js";
import { animateBoy } from "./hero-eyes.js";
const hero = document.querySelector("#hero");
const wake = document.querySelector("#wake-robot");
const robot = document.querySelector("#driving-robot");
const menu = document.querySelector("#menu");
const dock = document.querySelector("#dock");
const conversation = document.querySelector("#conversation");
const speech = document.querySelector("#speech");
const form = document.querySelector("#ask-form");
const input = document.querySelector("#ask");
const reducedMotion = matchMedia("(prefers-reduced-motion:reduce)");
const renderer = robotRenderer(robot);
const idleLights = document.createElement("span");
idleLights.className = "idle-lights";
idleLights.setAttribute("aria-hidden", "true");
robot.after(idleLights);
const boy = animateBoy(hero, reducedMotion);
const parkedCanvas = document.createElement("canvas");
parkedCanvas.width = 200;
parkedCanvas.height = 176;
parkedCanvas.setAttribute("aria-hidden", "true");
hero.querySelector(".parked-robot").append(parkedCanvas);
let started = false, parked = false;
let travel = 0;
const turnsReady = renderer.ready.then(() => {
  renderer.draw(-45, 0);
  parkedCanvas.getContext("2d").drawImage(robot, 0, 0);
});
function place(point) {
  robot.style.left = point.x - robot.offsetWidth / 2 + "px";
  robot.style.top = point.y - robot.offsetHeight / 2 + "px";
  idleLights.style.left = robot.style.left;
  idleLights.style.top = robot.style.top;
}
function dockPoint() {
  const r = dock.getBoundingClientRect();
  return { x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY };
}
function pagePlace(point) {
  place({ x: point.x - scrollX, y: point.y - scrollY });
}
function facesForward(yaw) {
  return Math.abs(yaw) < 0.1;
}
function continuousRoute({ start, a, b, c, end }) {
  const points = [start];
  const mix = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
  const distance = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);
  let current = start;
  for (const [corner, next] of [[a, b], [b, c], [c, end]]) {
    const radius = Math.min(68, distance(current, corner) * 0.42, distance(corner, next) * 0.42);
    const entry = mix(corner, current, radius / distance(corner, current));
    const exit = mix(corner, next, radius / distance(corner, next));
    points.push(entry);
    for (let i = 1; i <= 48; i++) {
      const t = i / 48;
      points.push(mix(mix(entry, corner, t), mix(corner, exit, t), t));
    }
    current = exit;
  }
  points.push(end);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + distance(points[i - 1], points[i]));
  const total = lengths.at(-1), duration = (total + 100) / 250 * 1e3;
  return new Promise((resolve) => {
    let begin;
    function frame(now) {
      begin ??= now;
      const t = Math.min(1, (now - begin) / duration), ramp = 0.14;
      const integral = t < ramp ? t * t / (2 * ramp) : t > 1 - ramp ? 1 - ramp - (1 - t) * (1 - t) / (2 * ramp) : t - ramp / 2;
      travel = total * integral / (1 - ramp);
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < travel) i++;
      const u = (travel - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
      pagePlace(mix(points[i - 1], points[i], u));
      const dx = points[i].x - points[i - 1].x, dy = points[i].y - points[i - 1].y;
      const tangent = 90 - Math.atan2(dy, dx) * 180 / Math.PI;
      const depart = Math.min(1, travel / 50), smooth = depart * depart * (3 - 2 * depart);
      const brake = facesForward(tangent) && t > 0.94 ? 2.1 * Math.min(1, (t - 0.94) / 0.06) : 0;
      renderer.draw(-45 + (tangent + 45) * smooth, travel, brake);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}
function settleChassis() {
  return new Promise((resolve) => {
    const begin = performance.now();
    function frame(now) {
      const seconds = (now - begin) / 1e3;
      const rock = 2.1 * Math.exp(-6.8 * seconds) * Math.cos(21 * seconds);
      renderer.draw(0, travel, rock);
      pagePlace(dockPoint());
      if (seconds < 0.65) requestAnimationFrame(frame);
      else {
        renderer.draw(0, travel);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}
function sceneRoute() {
  const h = hero.getBoundingClientRect();
  const start = { x: h.left + h.width * 0.52 + scrollX, y: h.top + h.height * 0.78 + scrollY };
  const end = dockPoint();
  const linkRects = [...menu.querySelectorAll("a")].map((link) => link.getBoundingClientRect());
  const leftGap = Math.min(...linkRects.map((r) => r.left));
  const corridor = Math.max(robot.offsetWidth / 2 + 6, leftGap / 2) + scrollX;
  const a = { x: corridor, y: start.y };
  const b = { x: corridor, y: end.y - 85 };
  const c = { x: end.x, y: end.y - 85 };
  return { start, end, a, b, c };
}
async function launch() {
  if (started) return;
  started = true;
  wake.setAttribute("aria-busy", "true");
  try {
    await turnsReady;
  } catch {
    started = false;
    wake.removeAttribute("aria-busy");
    return;
  }
  document.body.classList.add("started");
  const route = sceneRoute();
  const { start } = route;
  pagePlace(start);
  renderer.draw(-45, 0);
  hero.classList.add("awake");
  robot.classList.add("visible");
  if (!reducedMotion.matches) {
    boy.follow();
    await continuousRoute(route);
    await settleChassis();
    boy.settle();
  }
  parked = true;
  pagePlace(dockPoint());
  renderer.draw(0, travel);
  robot.classList.add("idle");
  robot.setAttribute("aria-hidden", "false");
  robot.tabIndex = 0;
  wake.removeAttribute("aria-busy");
  conversation.classList.add("open");
  conversation.inert = false;
}
function closeConversation() {
  if (!parked) return;
  conversation.classList.remove("open");
  conversation.inert = true;
}
function openConversation() {
  if (!parked) return;
  conversation.classList.add("open");
  conversation.inert = false;
  input.focus({ preventScroll: true });
}
wake.addEventListener("click", () => started ? openConversation() : launch());
document.querySelector("#close-chat").addEventListener("click", closeConversation);
robot.addEventListener("click", openConversation);
robot.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openConversation();
  }
});
document.addEventListener("scroll", () => {
  if (parked) pagePlace(dockPoint());
}, { passive: true, capture: true });
addEventListener("resize", () => {
  if (parked) requestAnimationFrame(() => pagePlace(dockPoint()));
});
visualViewport?.addEventListener("resize", () => {
  if (parked) requestAnimationFrame(() => pagePlace(dockPoint()));
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  answer(value);
  input.value = "";
});
function answer(question) {
  const lower = question.toLowerCase();
  if (/\b(projects?|work|builds?)\b|проект|дела|созда/.test(lower)) {
    speech.innerHTML = 'Visit the <a href="posts/pond.html">koi pond \u2197</a> and feed the fish.';
  } else if (/\b(games?|play)\b|игр/.test(lower)) {
    speech.innerHTML = 'Ready to play? Head over to <a href="posts/games.html">Games \u2197</a>.';
  } else if (/\b(nikita|yourself|who)\b|никит|кто|теб/.test(lower)) {
    speech.textContent = "You\u2019re on Nikita Zhurakov\u2019s personal site \u2014 a collection of projects, games, and experiments.";
  } else {
    speech.textContent = "Ask me about Nikita, projects, or games. I can help you find your way around the site.";
  }
}
