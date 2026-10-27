import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['node_modules/**', 'client/dist/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
  },
  {
    files: ['client/src/**/*.{js,jsx}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } }, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, react },
    rules: { ...reactHooks.configs.recommended.rules, 'react/jsx-uses-vars': 'error' },
  },
  {
    files: ['**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['server/src/middleware/*.js'],
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^next$' }] },
  },
];
