import baseConfig from '@fitora/config/eslint/base';
import reactConfig from '@fitora/config/eslint/react-native';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  ...reactConfig.filter((c) => !c.ignores),
  {
    ignores: ['dist/**'],
  },
];
