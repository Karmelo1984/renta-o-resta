import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tsdoc from 'eslint-plugin-tsdoc';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { tsdoc },
    rules: {
      'tsdoc/syntax': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      'no-console': 'error',
      'max-classes-per-file': ['error', 1],
      '@typescript-eslint/no-extraneous-class': ['error', { allowStaticOnly: true }],
    },
  },
  {
    files: ['src/core/log/Logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['tests/**/*.ts', 'vite.config.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'tsdoc/syntax': 'off' },
  },
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
