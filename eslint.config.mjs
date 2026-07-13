import baseConfig from '@fitora/config/eslint/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    // Root lint-staged uses this config; Nest DI needs value imports for injectables.
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/coverage/**',
    ],
  },
];
