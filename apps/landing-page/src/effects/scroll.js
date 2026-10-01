import { clamp, desktopQuery, lerp, onFrame, pinProgress, scroll } from './utils.js';

/** Fades and lifts [data-reveal] elements the first time they enter the viewport. */
export function initReveal(motion) {
  const elements = document.querySelectorAll('[data-reveal]');
  if (!motion || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  elements.forEach((element) => observer.observe(element));
}

/** Switches the page palette when a section crosses the middle of the viewport. */
export function initThemes() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) document.body.dataset.theme = entry.target.dataset.sectionTheme;
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  document.querySelectorAll('[data-section-theme]').forEach((section) => observer.observe(section));
}

/** Header hides while scrolling down, comes back on scroll up; a bar shows reading progress. */
export function initHeader() {
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('#main-nav');
  const progress = document.querySelector('.scroll-progress');
  let lastY = window.scrollY;

  onFrame(() => {
    const y = scroll.y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress?.style.setProperty('--progress', max > 0 ? String(y / max) : '0');
    header.classList.toggle('is-scrolled', y > 20);
    if (Math.abs(y - lastY) < 4) return;
    const menuOpen = nav?.classList.contains('open');
    header.classList.toggle('is-hidden', y > lastY && y > 300 && !menuOpen);
    lastY = y;
  });
}

/** Marquee speed and direction follow scroll velocity; it skews when scrolling fast. */
export function initMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  track.append(...[...track.children].map((child) => child.cloneNode(true)));
  let setWidth = track.scrollWidth / 2;
  window.addEventListener('resize', () => { setWidth = track.scrollWidth / 2; });

  let x = 0;
  let direction = 1;
  let skew = 0;
  onFrame((delta) => {
    const velocity = scroll.velocity;
    if (Math.abs(velocity) > 0.5) direction = Math.sign(velocity);
    x -= (1.2 + Math.abs(velocity) * 0.6) * direction * delta;
    if (x <= -setWidth) x += setWidth;
    if (x > 0) x -= setWidth;
    skew = lerp(skew, clamp(velocity * -0.25, -12, 12), 0.15);
    track.style.transform = `translate3d(${x}px, 0, 0) skewX(${skew}deg)`;
  });
}

/** "Como funciona": the section is pinned and each scroll third brings in the next step. */
export function initSteps() {
  const section = document.querySelector('.steps-section');
  if (!section) return;
  const steps = [...section.querySelectorAll('.step')];
  let activeIndex = -1;

  onFrame(() => {
    if (!desktopQuery.matches) {
      section.style.setProperty('--steps-progress', '1');
      return;
    }
    const progress = pinProgress(section);
    section.style.setProperty('--steps-progress', String(progress));
    const index = Math.min(steps.length - 1, Math.floor(progress * steps.length));
    if (index === activeIndex) return;
    activeIndex = index;
    steps.forEach((step, stepIndex) => {
      step.classList.toggle('is-active', stepIndex === index);
      step.classList.toggle('is-past', stepIndex < index);
    });
  });
}

/** Testimonials: vertical scroll drives a horizontal track while the section is pinned. */
export function initHorizontalTestimonials() {
  const section = document.querySelector('.testimonials');
  const track = section?.querySelector('.testimonial-track');
  if (!section || !track) return;
  let distance = 0;
  let current = 0;

  function measure() {
    if (!desktopQuery.matches) {
      section.style.height = '';
      track.style.transform = '';
      distance = 0;
      return;
    }
    distance = Math.max(0, track.scrollWidth - window.innerWidth);
    section.style.height = `${distance + window.innerHeight * 1.2}px`;
  }
  measure();
  window.addEventListener('resize', measure);
  desktopQuery.addEventListener('change', measure);

  onFrame((delta) => {
    if (!distance) return;
    current = lerp(current, pinProgress(section) * distance, clamp(0.12 * delta));
    track.style.transform = `translate3d(${-current}px, 0, 0)`;
  });
}

/** Paragraph words light up one by one as the paragraph moves through the viewport. */
export function initScrub() {
  document.querySelectorAll('[data-scrub]').forEach((element) => {
    const words = element.textContent.trim().split(/\s+/);
    element.setAttribute('aria-label', element.textContent.trim());
    element.innerHTML = words.map((word) => `<span class="word" aria-hidden="true">${word}</span>`).join(' ');
    const spans = [...element.querySelectorAll('.word')];

    onFrame(() => {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = clamp((window.innerHeight * 0.85 - rect.top) / (rect.height + window.innerHeight * 0.35));
      const lit = progress * spans.length;
      spans.forEach((span, index) => span.style.setProperty('--o', String(0.15 + 0.85 * clamp(lit - index))));
    });
  });
}

/** Numbers count up from zero when they scroll into view. */
export function initCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const element = entry.target;
      const end = Number(element.dataset.countTo);
      const start = performance.now();
      const duration = 1600;
      const step = (now) => {
        const progress = clamp((now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        element.textContent = Math.round(end * eased).toLocaleString('pt-BR');
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count-to]').forEach((element) => observer.observe(element));
}
