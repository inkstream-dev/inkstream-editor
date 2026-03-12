module.exports = {
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: ["prettier"],
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint", "react-hooks"],
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      rules: {
        "no-undef": "off",
        "no-unused-vars": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
      },
    },
    {
      files: ["**/*.{js,jsx,cjs,mjs}"],
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    {
      files: ["**/*.test.*", "**/*.spec.*"],
      env: {
        jest: true,
      },
    },
  ],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
  },
};
