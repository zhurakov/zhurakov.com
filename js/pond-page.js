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
let last = 0;
let accumulator = 0;
let visible = true;
let lastPointerTime = 0;

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

function frame(now) {
  if (!visible || reduceMotion.matches) return;
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
  raf = requestAnimationFrame(frame);
}

function schedule() {
  cancelAnimationFrame(raf);
  if (!visible) return;
  if (reduceMotion.matches) {
    drawStill();
    return;
  }
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

function onPointerMove(event) {
  const { x, y, inside } = toLocal(event);
  const pointer = world.pointer;
  const elapsed = Math.max(1, event.timeStamp - lastPointerTime) / 1000;
  const speed = Math.hypot(x - pointer.x, y - pointer.y) / elapsed;
  pointer.speed += (Math.min(speed, 5000) - pointer.speed) * 0.5;
  lastPointerTime = event.timeStamp;
  pointer.x = x;
  pointer.y = y;
  pointer.active = inside && event.pointerType !== "touch";
}

function onPointerUp(event) {
  if (reduceMotion.matches) return;
  const { x, y, inside } = toLocal(event);
  if (inside) world.feed(x, y);
}

function onPointerLeave() {
  world.pointer.active = false;
  world.pointer.speed = 0;
}

new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  schedule();
}).observe(canvas);

window.addEventListener("pointermove", onPointerMove, { passive: true });
canvas.addEventListener("pointerup", onPointerUp);
document.documentElement.addEventListener("pointerleave", onPointerLeave);
window.addEventListener("blur", onPointerLeave);
reduceMotion.addEventListener("change", schedule);
resize();
schedule();
