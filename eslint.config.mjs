import baseConfig from '@fitora/config/eslint/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    // Nest DI needs runtime class tokens. Root lint-staged uses this config, so
    // keep Nest injectables as value imports (not erased to Function).
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
      'archive/**',
    ],
  },
];
