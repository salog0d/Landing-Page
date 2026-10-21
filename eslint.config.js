import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Playwright scripts: Node, plus browser globals inside page.evaluate callbacks.
  {
    files: ['scripts/**', 'tests/**', '*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  { files: ['src/**'], languageOptions: { globals: globals.browser } },
  prettier,
);
