/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/test/**/*.e2e-spec.ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/auth/**/*.(t|j)s',
    'src/bookings/**/*.(t|j)s',
    'src/memberships/**/*.(t|j)s',
    'src/payments/**/*.(t|j)s',
    'src/training/**/*.(t|j)s',
    'src/shop/**/*.(t|j)s',
    'src/services/**/*.(t|j)s',
    'src/print/**/*.(t|j)s',
    'src/notifications/**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.controller.ts',
    '!**/*.module.ts',
    '!**/dto/**',
    '!**/index.ts',
    '!src/auth/middleware/**',
    '!src/notifications/providers/**',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 67,
      lines: 68,
      statements: 66,
    },
  },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  moduleNameMapper: {
    '^@nestjs/config$': '<rootDir>/test/mocks/nestjs-config.mock.ts',
    '^@fitora/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@fitora/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
