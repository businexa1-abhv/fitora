import baseConfig from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Nest DI needs runtime class tokens (emitDecoratorMetadata). Autofixing
      // constructor injectables to `import type` erases them to Function.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
