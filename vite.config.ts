import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this repo under /Landing-Page/. Dev always runs at /.
  // Set VITE_BASE='/' when pointing a custom domain (e.g. fantazylabz.com) at the site.
  base: command === 'build' ? (process.env.VITE_BASE ?? '/Landing-Page/') : '/',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        review: fileURLToPath(new URL('./website-review.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
        terms: fileURLToPath(new URL('./terms.html', import.meta.url)),
      },
    },
  },
}));
