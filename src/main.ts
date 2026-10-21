import '@fontsource-variable/raleway/wght.css';
import '@fontsource-variable/roboto/wght.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/motion.css';

const EMAIL = 'proyectos@fantazylabz.tech';

// ---------- Mobile menu ----------
const header = document.querySelector<HTMLElement>('.nav')!;
const toggle = header.querySelector<HTMLButtonElement>('.nav__toggle')!;

function setMenu(open: boolean) {
  header.classList.toggle('is-open', open);
  document.body.classList.toggle('no-scroll', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

toggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
header
  .querySelectorAll('.nav__menu a')
  .forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && header.classList.contains('is-open')) {
    setMenu(false);
    toggle.focus();
  }
});
matchMedia('(min-width: 900px)').addEventListener('change', (e) => e.matches && setMenu(false));

// ---------- Reveal on enter (CSS transitions; motion.css neutralizes them for reduced motion) ----------
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  },
  { rootMargin: '0px 0px -8% 0px' },
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// ---------- Contact form (Formspree, endpoint from VITE_FORM_ENDPOINT) ----------
const form = document.querySelector<HTMLFormElement>('#contact-form')!;
const status = form.querySelector<HTMLElement>('#form-status')!;
const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const endpoint: string | undefined = import.meta.env.VITE_FORM_ENDPOINT;

function setStatus(state: 'sending' | 'success' | 'error', message: string) {
  form.dataset.state = state;
  status.textContent = message;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!endpoint) {
    setStatus('error', `The form isn't available right now. Please email us at ${EMAIL}.`);
    return;
  }
  submit.disabled = true;
  setStatus('sending', 'Sending your message…');
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    form.reset();
    setStatus('success', "Thanks! Your message was sent. We'll get back to you soon.");
  } catch {
    setStatus('error', `Something went wrong. Please try again or email us at ${EMAIL}.`);
  } finally {
    submit.disabled = false;
  }
});

// ---------- Scroll-driven motion: GSAP loads after first paint, never with reduced motion ----------
// ponytail: preference is read once at load; toggling it mid-session is handled by gsap.matchMedia only after GSAP loaded.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const load = () => import('./motion').then((m) => m.initMotion());
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 1500 });
  else setTimeout(load, 200);
}
