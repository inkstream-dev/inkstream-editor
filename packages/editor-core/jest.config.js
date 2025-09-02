module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@inkstream/(.*)$': '<rootDir>/../$1/src',
  },
};
