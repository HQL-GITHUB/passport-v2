import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'artifacts/', 'test-results/', 'playwright-report/', '.cache/', '.work/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
    rules: {
      // An empty `catch {}` is how the code says that a failure is left alone.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  { files: ['src/**'], languageOptions: { globals: globals.browser } },
  // The specs run in Node, and hand functions to the page to run there.
  {
    files: ['tests/e2e/**'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  { files: ['*.js', 'scripts/**', 'tests/unit/**'], languageOptions: { globals: globals.node } },
];
