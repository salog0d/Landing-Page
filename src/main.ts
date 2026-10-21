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
const header = document.querySelector<HTMLElement>('.nav');
if (header) {
  const toggle = header.querySelector<HTMLButtonElement>('.nav__toggle');
  if (toggle) {
    const setMenu = (open: boolean) => {
      header.classList.toggle('is-open', open);
      document.body.classList.toggle('no-scroll', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
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
  }
}

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

// ---------- Forms (Formspree, endpoint from VITE_FORM_ENDPOINT) ----------
const endpoint: string | undefined = import.meta.env.VITE_FORM_ENDPOINT;

function bindForm(form: HTMLFormElement) {
  const status = form.querySelector<HTMLElement>('[data-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!status || !submit) return;

  const setStatus = (state: 'sending' | 'success' | 'error', message: string) => {
    form.dataset.state = state;
    status.textContent = message;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Honeypot: bots fill it, humans never see it.
    const gotcha = form.querySelector<HTMLInputElement>('[name="_gotcha"]');
    if (gotcha?.value) return;
    if (!endpoint) {
      setStatus('error', `This form isn't available right now. Please email us at ${EMAIL}.`);
      return;
    }
    submit.disabled = true;
    setStatus('sending', form.dataset.sending ?? 'Sending…');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      form.dispatchEvent(new Event('form:sent'));
      setStatus('success', form.dataset.success ?? "Thanks! We'll get back to you soon.");
    } catch {
      setStatus(
        'error',
        form.dataset.error ?? `Something went wrong. Please try again or email us at ${EMAIL}.`,
      );
    } finally {
      submit.disabled = false;
    }
  });
}
document.querySelectorAll<HTMLFormElement>('form[data-js-form]').forEach(bindForm);

// ---------- Multi-step qualifier (Start a Project) ----------
document.querySelectorAll<HTMLElement>('[data-stepper]').forEach((stepper) => {
  const steps = Array.from(stepper.querySelectorAll<HTMLElement>('[data-step]'));
  const next = stepper.querySelector<HTMLButtonElement>('[data-next]');
  const back = stepper.querySelector<HTMLButtonElement>('[data-back]');
  const submit = stepper.querySelector<HTMLButtonElement>('button[type="submit"]');
  const progress = stepper.querySelector<HTMLElement>('[data-progress]');
  const titles = Array.from(stepper.querySelectorAll<HTMLElement>('[data-step-title]')).map(
    (el) => el.textContent?.trim() ?? '',
  );
  let current = 0;

  const show = (i: number) => {
    current = i;
    steps.forEach((step, k) => {
      step.hidden = k !== i;
    });
    if (progress) progress.textContent = `Step ${i + 1} of ${steps.length} · ${titles[i] ?? ''}`;
    if (next) next.hidden = i === steps.length - 1;
    if (submit) submit.hidden = i !== steps.length - 1;
    if (back) back.hidden = i === 0;
  };

  const stepIsValid = (i: number) => {
    let ok = true;
    steps[i]
      .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input, textarea, select',
      )
      .forEach((field) => {
        if (!field.checkValidity()) {
          field.reportValidity();
          ok = false;
        }
      });
    return ok;
  };

  next?.addEventListener('click', () => stepIsValid(current) && show(current + 1));
  back?.addEventListener('click', () => show(Math.max(0, current - 1)));
  stepper.closest('form')?.addEventListener('form:sent', () => show(0));
  show(0);
});

// ---------- Scroll-driven motion: GSAP loads after first paint, never with reduced motion ----------
// Pages without a hero (privacy, terms) never request GSAP at all.
if (document.querySelector('.hero') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const load = () => import('./motion').then((m) => m.initMotion());
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 1500 });
  else setTimeout(load, 200);
}
