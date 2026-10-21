# Fantazy Labz — landing page

Vite + vanilla TypeScript. GSAP + ScrollTrigger drive the scroll-scrubbed motion. They load lazily, and never when the visitor prefers reduced motion.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run lint       # ESLint + Prettier check
npm test           # Playwright checks: pin, reduced motion, mobile menu, form
npm run og         # re-render public/og.png from scripts/og.html
```

`npm test` and `npm run og` need a Chromium. Run `npx playwright install chromium` once, or point `CHROME_PATH` at a local Chrome.

## Structure

- `index.html`: all content and SEO meta
- `src/main.ts`: mobile menu, reveal-on-enter, contact form, lazy GSAP loader
- `src/motion.ts`: hero scroll-out, word highlight, pinned services, CTA scale, portfolio parallax
- `src/styles/`: `tokens` → `base` → `layout` → `components` → `motion`, bundled into one CSS file
- `public/`: `robots.txt`, `sitemap.xml`, `og.png`, `favicon.svg`

Motion rules:

- Animations only touch `transform` and `opacity`. `npm test` asserts this for scrubbed elements.
- The services pin only runs at ≥1024px with motion allowed. Everywhere else, the cards sit in normal flow.

## Deploy (Netlify)

1. Create a form at formspree.io and copy its endpoint (`https://formspree.io/f/xxxxxxx`). Set the recipient to `proyectos@fantazylabz.tech`.
2. In Netlify, go to **Add new site → Import from Git** and pick this repo. `netlify.toml` already sets the build.
3. Under **Site configuration → Environment variables**, add `VITE_FORM_ENDPOINT`, then redeploy.
4. Point `fantazylabz.com` at the site. Canonical, OG, sitemap and robots all assume that domain.

`VITE_FORM_ENDPOINT` gets inlined into the public bundle. It is config, not a secret. Formspree endpoints are designed to be public.

## Pending content

- **Testimonials**: the quotes in `index.html` are truncated in the source. Replace them with the full text (search for `TODO(content)`).
- **Portfolio screenshots**: put the images in `public/work/` and add an `<img>` inside each `.shot__media` (a commented example is in `index.html`). The frame is fixed at 16:10 with `object-fit: cover`, and the gradient placeholder hides itself once the slot has content.
