module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Must come before the general @inkstream/* rule — subpath imports need
    // to resolve to the correct src file inside the pm package.
    '^@inkstream/pm/(.*)$': '<rootDir>/../pm/src/$1',
    '^@inkstream/(.*)$': '<rootDir>/../$1/src',
  },
  // Collect coverage from source files only (exclude dist, test-utils, test files)
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test-utils/**',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  // Show individual test results
  verbose: false,
};
