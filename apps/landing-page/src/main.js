import { clamp, hasFinePointer, prefersReducedMotion } from './effects/utils.js';
import { initCategoryPreview, initCursor, initHeroParallax, initMagnetic, initSpotlight, initTilt } from './effects/pointer.js';
import { initCounters, initHeader, initHorizontalTestimonials, initMarquee, initReveal, initScrub, initSteps, initThemes } from './effects/scroll.js';

const motion = !prefersReducedMotion;
if (motion) document.documentElement.classList.add('motion');

const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('#main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('open', !isOpen);
});

navigation?.addEventListener('click', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('open');
});

document.querySelector('#year').textContent = String(new Date().getFullYear());

// Footer wordmark: one span per letter so each can react to hover.
const footerWord = document.querySelector('.footer-word');
if (footerWord) footerWord.innerHTML = [...footerWord.textContent].map((letter) => `<span>${letter}</span>`).join('');

/** Counts 0 → 100 over the brand, then lifts the curtain and starts the hero entrance. */
function runPreloader() {
  const count = document.querySelector('.preloader-count');
  const finish = () => document.body.classList.add('is-loaded');
  if (!motion || !count) {
    finish();
    return;
  }
  const duration = 1400;
  const start = performance.now();
  const step = (now) => {
    const progress = clamp((now - start) / duration);
    count.textContent = String(Math.round((1 - Math.pow(1 - progress, 3)) * 100));
    if (progress < 1) requestAnimationFrame(step);
    else setTimeout(finish, 150);
  };
  requestAnimationFrame(step);
}

runPreloader();
initReveal(motion);
initThemes();
initHeader();

if (motion) {
  initMarquee();
  initSteps();
  initHorizontalTestimonials();
  initScrub();
  initCounters();
  initHeroParallax();
  initTilt();
  initMagnetic();
  initSpotlight();

  if (hasFinePointer) {
    initCursor();
    initCategoryPreview();
  }
}
