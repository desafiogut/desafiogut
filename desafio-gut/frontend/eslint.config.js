import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-undef": "error",
      // MC89.47-S1: catch vazios intencionais são padrão do codebase
      // (operações best-effort). A regra segue ativa p/ if/loop vazios.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "android/**",
      "netlify/functions/**",
      "chunk_prod.js",
      ".claude/**",
    ],
  },
];
