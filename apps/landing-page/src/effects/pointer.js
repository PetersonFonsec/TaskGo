import { clamp, lerp, onFrame, scroll } from './utils.js';

/** Custom cursor: a dot glued to the pointer and a ring that trails it, with labels on [data-cursor]. */
export function initCursor() {
  const cursor = document.querySelector('.cursor');
  if (!cursor) return;
  const dot = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');
  const label = cursor.querySelector('.cursor-label');
  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPosition = { ...target };
  let scale = 1;

  document.documentElement.classList.add('has-cursor');

  window.addEventListener('pointermove', (event) => {
    target.x = event.clientX;
    target.y = event.clientY;
    cursor.classList.remove('is-hidden');
  });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  window.addEventListener('pointerdown', () => { scale = 0.7; });
  window.addEventListener('pointerup', () => { scale = 1; });

  document.addEventListener('pointerover', (event) => {
    const labelled = event.target.closest('[data-cursor]');
    const interactive = event.target.closest('a, button');
    cursor.classList.toggle('has-label', Boolean(labelled));
    cursor.classList.toggle('is-hover', Boolean(interactive) && !labelled);
    if (labelled) label.textContent = labelled.dataset.cursor;
  });

  let currentScale = 1;
  onFrame((delta) => {
    ringPosition.x = lerp(ringPosition.x, target.x, clamp(0.18 * delta));
    ringPosition.y = lerp(ringPosition.y, target.y, clamp(0.18 * delta));
    currentScale = lerp(currentScale, scale, 0.2);
    dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
    ring.style.transform = `translate3d(${ringPosition.x}px, ${ringPosition.y}px, 0) scale(${currentScale})`;
  });
}

/** Elements pulled toward the pointer; their first child moves a little further for depth. */
export function initMagnetic() {
  document.querySelectorAll('[data-magnetic]').forEach((element) => {
    const inner = element.firstElementChild;
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      element.style.transition = 'transform .2s ease-out';
      element.style.transform = `translate3d(${x * 0.3}px, ${y * 0.35}px, 0)`;
      if (inner && inner.tagName === 'SPAN') inner.style.transform = `translate3d(${x * 0.12}px, ${y * 0.12}px, 0)`;
    });
    element.addEventListener('pointerleave', () => {
      element.style.transition = 'transform .8s cubic-bezier(.16, 1, .3, 1)';
      element.style.transform = '';
      if (inner && inner.tagName === 'SPAN') inner.style.transform = '';
    });
  });
}

/** 3D tilt that follows the pointer across a card. */
export function initTilt() {
  document.querySelectorAll('[data-tilt]').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      element.style.transition = 'transform .15s ease-out, opacity 1s';
      element.style.transform = `perspective(800px) rotateX(${-y * 16}deg) rotateY(${x * 16}deg) translateZ(20px)`;
    });
    element.addEventListener('pointerleave', () => {
      element.style.transition = 'transform .8s cubic-bezier(.16, 1, .3, 1), opacity 1s';
      element.style.transform = '';
    });
  });
}

/** Radial highlight that follows the pointer inside a card. */
export function initSpotlight() {
  document.querySelectorAll('[data-spotlight]').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--x', `${event.clientX - rect.left}px`);
      element.style.setProperty('--y', `${event.clientY - rect.top}px`);
    });
  });
}

/** Hero: layers drift with the pointer at different depths and the phone tilts in 3D. */
export function initHeroParallax() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const layers = [...hero.querySelectorAll('[data-depth]')].map((element) => ({
    element,
    depth: Number(element.dataset.depth),
    isPhone: element.classList.contains('phone'),
  }));
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };

  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    target.x = event.clientX / rect.width - 0.5;
    target.y = (event.clientY - rect.top) / rect.height - 0.5;
    hero.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    hero.style.setProperty('--my', `${event.clientY - rect.top}px`);
  });
  hero.addEventListener('pointerleave', () => {
    target.x = 0;
    target.y = 0;
  });

  onFrame((delta) => {
    if (scroll.y > window.innerHeight * 1.2) return;
    current.x = lerp(current.x, target.x, clamp(0.08 * delta));
    current.y = lerp(current.y, target.y, clamp(0.08 * delta));
    layers.forEach(({ element, depth, isPhone }) => {
      const x = current.x * depth * 50;
      const y = current.y * depth * 50 - scroll.y * depth * 0.25;
      const rotation = isPhone
        ? ` rotateY(${current.x * 22}deg) rotateX(${-current.y * 18}deg) rotate(${6 - current.x * 4}deg)`
        : '';
      element.style.transform = `translate3d(${x}px, ${y}px, 0)${rotation}`;
    });
  });
}

/** Category list: a coloured card with the category emoji trails the pointer while hovering a row. */
export function initCategoryPreview() {
  const list = document.querySelector('.categories');
  const preview = document.querySelector('.category-preview');
  if (!list || !preview) return;
  const face = preview.querySelector('span');
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let rotation = 0;

  list.addEventListener('pointermove', (event) => {
    target.x = event.clientX;
    target.y = event.clientY;
  });
  list.addEventListener('pointerenter', (event) => {
    current.x = target.x = event.clientX;
    current.y = target.y = event.clientY;
  });
  list.addEventListener('pointerleave', () => preview.classList.remove('is-visible'));
  list.querySelectorAll('.category').forEach((category) => {
    category.style.setProperty('--c', category.dataset.color);
    category.addEventListener('pointerenter', () => {
      face.textContent = category.dataset.preview;
      preview.style.setProperty('--preview-color', category.dataset.color);
      preview.classList.add('is-visible');
    });
  });

  onFrame((delta) => {
    const previousX = current.x;
    current.x = lerp(current.x, target.x, clamp(0.14 * delta));
    current.y = lerp(current.y, target.y, clamp(0.14 * delta));
    rotation = lerp(rotation, clamp((current.x - previousX) * 0.8, -20, 20), 0.2);
    preview.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
    preview.style.setProperty('--preview-rotate', `${rotation}deg`);
  });
}
