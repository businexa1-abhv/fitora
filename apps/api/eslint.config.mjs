import nestConfig from '@fitora/config/eslint/nest';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nestConfig,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
