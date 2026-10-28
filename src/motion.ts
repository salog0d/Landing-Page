import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Rule: every tween below animates transform (x/y/scale) or opacity only.

gsap.registerPlugin(ScrollTrigger);

export function initMotion() {
  splitHighlight();

  const mm = gsap.matchMedia();
  mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    const { motion } = ctx.conditions!;
    if (!motion) return;

    heroOut();
    heroChips();
    highlight();
    ctaIn();
    parallax();
    mockReveal();
  });

  // Web fonts change text height after load; re-measure once they're in.
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

/** Wraps each word of `.highlight` for the scrubbed read-along; screen readers get the plain sentence. */
function splitHighlight() {
  const p = document.querySelector<HTMLElement>('.highlight');
  if (!p || p.querySelector('.hl-w')) return;
  const text = p.textContent!.trim().replace(/\s+/g, ' ');
  const sr = Object.assign(document.createElement('span'), {
    className: 'sr-only',
    textContent: text,
  });
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  text.split(' ').forEach((word, i) => {
    if (i) visual.append(' ');
    visual.append(
      Object.assign(document.createElement('span'), { className: 'hl-w', textContent: word }),
    );
  });
  p.replaceChildren(sr, visual);
}

function heroOut() {
  if (!document.querySelector('.hero')) return;
  const scrollTrigger = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__inner', { yPercent: 18, scale: 0.94, opacity: 0, ease: 'none', scrollTrigger });
  gsap.to('.hero__glow', { scale: 1.35, opacity: 0.4, ease: 'none', scrollTrigger });
}

/** Floating chips over the hero mock drift at different speeds while the hero scrolls out. */
function heroChips() {
  const chips = gsap.utils.toArray<HTMLElement>('.chip');
  if (!chips.length) return;
  const scrollTrigger = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  chips.forEach((chip, i) => {
    gsap.fromTo(chip, { y: 0 }, { y: i % 2 ? -32 : -56, ease: 'none', scrollTrigger });
  });
}

/** Before/after mocks settle into place on scroll. */
function mockReveal() {
  gsap.utils.toArray<HTMLElement>('.transform__item .mock').forEach((mock) => {
    gsap.fromTo(
      mock,
      { scale: 0.96, opacity: 0.55 },
      {
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: mock, start: 'top 92%', end: 'top 40%', scrub: true },
      },
    );
  });
}

function highlight() {
  if (!document.querySelector('.hl-w')) return;
  gsap.fromTo(
    '.hl-w',
    { opacity: 0.4 }, // dimmed words stay ≥3:1 on #060606 (AA large text)
    {
      opacity: 1,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: '.highlight', start: 'top 85%', end: 'bottom 45%', scrub: true },
    },
  );
}

function ctaIn() {
  const title = document.querySelector('.cta__title');
  if (!title) return;
  gsap.fromTo(
    title,
    { scale: 0.82, opacity: 0.2, y: 60 },
    {
      scale: 1,
      opacity: 1,
      y: 0,
      ease: 'none',
      scrollTrigger: { trigger: title, start: 'top bottom', end: 'center 55%', scrub: true },
    },
  );
}

function parallax() {
  gsap.utils.toArray<HTMLElement>('.shot').forEach((shot) => {
    gsap.fromTo(
      shot.querySelector('.shot__media'),
      { yPercent: -7, scale: 1.18 },
      {
        yPercent: 7,
        scale: 1.18,
        ease: 'none',
        scrollTrigger: { trigger: shot, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}
