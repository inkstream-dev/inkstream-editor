module.exports = {
  root: true,
  extends: ['./packages/eslint-config'],
  ignorePatterns: [
    '**/dist/**',
    '**/coverage/**',
    '**/.next/**',
    '**/node_modules/**',
    'out/**',
  ],
};
