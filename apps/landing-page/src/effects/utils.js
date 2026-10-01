export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (from, to, amount) => from + (to - from) * amount;

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const desktopQuery = window.matchMedia('(min-width: 901px)');

/** How far (0 → 1) the page has scrolled through a tall section whose inner content is sticky. */
export function pinProgress(element) {
  const rect = element.getBoundingClientRect();
  const distance = rect.height - window.innerHeight;
  return distance > 0 ? clamp(-rect.top / distance) : 0;
}

/** One shared requestAnimationFrame loop; callbacks receive a frame-rate independent delta (1 ≈ 60fps). */
const frameCallbacks = new Set();
let lastFrame = performance.now();

function tick(now) {
  const delta = Math.min(64, now - lastFrame) / (1000 / 60);
  lastFrame = now;
  frameCallbacks.forEach((callback) => callback(delta));
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

export function onFrame(callback) {
  frameCallbacks.add(callback);
}

/** Smoothed scroll velocity in pixels per frame, shared by every scroll-reactive effect. */
export const scroll = { y: window.scrollY, velocity: 0 };
onFrame(() => {
  const y = window.scrollY;
  scroll.velocity = lerp(scroll.velocity, y - scroll.y, 0.2);
  scroll.y = y;
});
