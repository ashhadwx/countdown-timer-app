/**
 * ESLint config for Countdown Timer app (backend, admin frontend, widget).
 */
import js from "@eslint/js";

export default [
  { ignores: ["**/node_modules/**", "**/dist/**", "**/build/**", "theme-extension/countdown-timer/assets/countdown-widget.js"] },
  js.configs.recommended,
  {
    files: ["server/**/*.js", "server/**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "writable",
        URL: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
    },
  },
  {
    files: ["admin-app/**/*.js", "admin-app/**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        console: "readonly",
        confirm: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: { "no-unused-vars": "off" }, // JSX uses components; parser does not track them
  },
  {
    files: ["widget/**/*.js", "widget/**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        URLSearchParams: "readonly",
        AbortSignal: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["widget/scripts/**/*.js"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
];
