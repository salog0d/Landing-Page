# Fantazy Labz — landing page

Vite + vanilla TypeScript, multi-page. GSAP + ScrollTrigger drive the scroll-scrubbed motion. They load lazily, and never when the visitor prefers reduced motion.

The site implements the commercial strategy in `Estrategia_comercial_one_pager_Fantazy_Labz.docx`: a one-pager that sells **Fantazy Website System** to US service businesses, with two conversion levels — **Start a Project** (hot traffic) and **Get a Website Review** (cold traffic).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run lint       # ESLint + Prettier check
npm test           # Playwright checks: pin, reduced motion, mobile menu, forms
npm run og         # re-render public/og.png from scripts/og.html
```

`npm test` and `npm run og` need a Chromium. Run `npx playwright install chromium` once, or point `CHROME_PATH` at a local Chrome.

## Pages

- `index.html` — the one pager: Hero → Trust strip → Problem → Transformation → Featured work → Website system → Lean model → Process → Pricing → Delivery commitments → Why Fantazy → Testimonials → FAQ → Final CTA with the multi-step qualifier form (`#contact-form`)
- `website-review.html` — free website review page for cold traffic: URL + email + priority, three concrete observations promised within two business days
- `privacy.html`, `terms.html` — legal pages referenced from the footer

`vite.config.ts` wires the four entries for the multi-page build.

## Structure

- `src/main.ts`: mobile menu, reveal-on-enter, Formspree binding for any `form[data-js-form]`, multi-step qualifier (`[data-stepper]`), lazy GSAP loader
- `src/motion.ts`: hero scroll-out, word highlight, pinned website system, CTA scale, portfolio parallax
- `src/styles/`: `tokens` → `base` → `layout` → `components` → `motion`, bundled into one CSS file
- `public/`: `robots.txt`, `sitemap.xml`, `og.png`, `favicon.svg`

Motion rules:

- Animations only touch `transform` and `opacity`. `npm test` asserts this for scrubbed elements.
- The website-system pin only runs at ≥1024px with motion allowed. Everywhere else, the cards sit in normal flow.

## Forms

Both forms POST to the Formspree endpoint from `VITE_FORM_ENDPOINT`. Each carries a hidden `_subject` ("Start a Project…" / "Website Review…") so Formspree can route them, plus the honeypot `_gotcha` field.

The Start a Project form is a two-step qualifier per the strategy: need, investment range and timing first; name, company, email, website, outcome and obstacle second. Submission success, error and step state are asserted in `npm test`.

## Deploy (GitHub Pages)

The site deploys automatically on every push to `main` via `.github/workflows/deploy.yml`. It is served at **https://salog0d.github.io/Landing-Page/** — `vite.config.ts` sets `base: '/Landing-Page/'` for that subpath.

One-time setup:

1. **Enable Pages**: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow builds with Vite, uploads `dist/` and deploys.
2. **Form endpoint** (optional but recommended): add the Formspree endpoint as a repository secret **Settings → Secrets and variables → Actions → `VITE_FORM_ENDPOINT`**. Without it, forms fall back to showing the contact email.
3. The repo must be **public** (or GitHub Pro) for Pages on the free plan.

Custom domain (e.g. fantazylabz.com): add the domain in **Settings → Pages → Custom domain**, commit a `CNAME` file, and set `VITE_BASE='/'` in the workflow build step. Canonical, OG and sitemap currently point at the `salog0d.github.io/Landing-Page/` URLs and must be updated too.

## Deploy (Netlify, alternative)

1. Create forms at formspree.io and copy the endpoint (`https://formspree.io/f/xxxxxxx`). Set the recipient to `proyectos@fantazylabz.tech`. If you want separate routing per form, create one endpoint per form and extend `src/main.ts`.
2. In Netlify, go to **Add new site → Import from Git** and pick this repo. `netlify.toml` already sets the build; set `VITE_BASE` to `/` for a root domain.
3. Under **Site configuration → Environment variables**, add `VITE_FORM_ENDPOINT`, then redeploy.
4. Point `fantazylabz.com` at the site and update canonical, OG and sitemap URLs accordingly.

`VITE_FORM_ENDPOINT` gets inlined into the public bundle. It is config, not a secret. Formspree endpoints are designed to be public.

## Pending content

- **Testimonials**: the quotes were completed from the truncated originals — confirm the full text with each client before publishing (search for `TODO(content)` in `index.html`).
- **Portfolio screenshots**: put the images in `public/work/` and add an `<img>` inside each `.shot__media` (a commented example is in `index.html`). The frame is fixed at 16:10 with `object-fit: cover`, and the gradient placeholder hides itself once the slot has content.
- **Legal pages**: `privacy.html` and `terms.html` are drafts for review by someone qualified.
- **Review SLA**: the review page promises a reply within two business days — only keep that promise if the team can answer with quality within that window.
- **Per-vertical pages**: the strategy recommends auxiliary pages in the language of each vertical (consulting, recruiting, engineering, logistics) for campaigns and outbound. The main site intentionally stays on "service businesses".
- **OG image**: `npm run og` regenerates `public/og.png` with the new headline.

## Attribution

- Strategy and copy direction: `Estrategia_comercial_one_pager_Fantazy_Labz.docx`
- Brand identity: `identidad-negocio.md`
