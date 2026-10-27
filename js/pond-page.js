// The koi simulation in js/koi/ is sourced from Dao Ho's public portfolio:
// https://github.com/Dao-Ho/portfolio
// This adapter provides a framework-free page shell for zhurakov.com.
import { World } from "./koi/dist/world.js";
import { KoiRenderer } from "./koi/dist/renderer.js";

const canvas = document.querySelector("#koi-pond");
const world = new World();
const renderer = new KoiRenderer(canvas);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const STEP = 1 / 60;
const MAX_STEPS = 4;
let raf = 0;
let loop = 0;
let last = 0;
let accumulator = 0;
let onScreen = true;
let pageVisible = document.visibilityState !== "hidden";
let lastPointerTime = 0;

function running() {
  return onScreen && pageVisible;
}

function resize() {
  const { width, height } = canvas.getBoundingClientRect();
  if (width < 1 || height < 1) return;
  renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, 2));
  world.resize(width, height);
  if (reduceMotion.matches) drawStill();
}

function toLocal(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
}

function drawStill() {
  if (world.time < 4) {
    for (let i = 0; i < 240; i += 1) world.step(STEP);
  }
  renderer.render(world, STEP);
}

function frame(now, id) {
  if (id !== loop || !running() || reduceMotion.matches) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  accumulator += dt;
  let steps = 0;
  while (accumulator >= STEP && steps < MAX_STEPS) {
    world.step(STEP);
    accumulator -= STEP;
    steps += 1;
  }
  if (steps === MAX_STEPS) accumulator = 0;
  renderer.render(world, dt);
  raf = requestAnimationFrame((next) => frame(next, id));
}

function schedule() {
  cancelAnimationFrame(raf);
  const id = ++loop;
  if (!running()) return;
  if (reduceMotion.matches) {
    drawStill();
    return;
  }
  accumulator = 0;
  last = performance.now();
  raf = requestAnimationFrame((now) => frame(now, id));
}

let touchDown = false;

function overChrome(event) {
  return event.target instanceof Element && !!event.target.closest("a");
}

function movePointer(event, active) {
  const { x, y, inside } = toLocal(event);
  const pointer = world.pointer;
  const elapsed = Math.max(1, event.timeStamp - lastPointerTime) / 1000;
  const speed = Math.hypot(x - pointer.x, y - pointer.y) / elapsed;
  pointer.speed += (Math.min(speed, 5000) - pointer.speed) * 0.5;
  lastPointerTime = event.timeStamp;
  pointer.x = x;
  pointer.y = y;
  pointer.active = active && inside;
}

function onPointerDown(event) {
  if (event.pointerType !== "touch" || overChrome(event)) return;
  const { x, y, inside } = toLocal(event);
  touchDown = true;
  world.pointer.x = x;
  world.pointer.y = y;
  world.pointer.speed = 0;
  world.pointer.active = inside;
  lastPointerTime = event.timeStamp;
}

function onPointerMove(event) {
  if (event.pointerType === "touch" && !touchDown) return;
  movePointer(event, true);
}

function onPointerUp(event) {
  const touch = event.pointerType === "touch";
  if (touch) touchDown = false;
  if (!overChrome(event) && !reduceMotion.matches && event.target === canvas) {
    const { x, y, inside } = toLocal(event);
    if (inside) world.feed(x, y);
  }
  if (touch) onPointerLeave();
}

function onPointerLeave() {
  world.pointer.active = false;
  world.pointer.speed = 0;
}

new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
  schedule();
}).observe(canvas);

document.addEventListener("visibilitychange", () => {
  pageVisible = document.visibilityState !== "hidden";
  schedule();
});

window.addEventListener("pointerdown", onPointerDown, { passive: true });
window.addEventListener("pointermove", onPointerMove, { passive: true });
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", (event) => {
  if (event.pointerType === "touch") {
    touchDown = false;
    onPointerLeave();
  }
});
document.documentElement.addEventListener("pointerleave", onPointerLeave);
window.addEventListener("blur", onPointerLeave);
reduceMotion.addEventListener("change", schedule);
resize();
schedule();
