import baseConfig from '@fitora/config/eslint/react-native';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ['.expo/**', 'dist/**', 'node_modules/**'],
  },
];
