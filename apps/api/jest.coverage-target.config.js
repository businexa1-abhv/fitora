/** @type {import('jest').Config} */
const base = require('./jest.config.js');

module.exports = {
  ...base,
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 90,
      statements: 90,
    },
  },
};
