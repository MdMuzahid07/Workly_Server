import js from "@eslint/js";
import tsEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

const isFastLint = process.env.FAST_LINT === "true";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "src/generated/**",
      "coverage/**",
      "*.d.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: isFastLint ? undefined : "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsEslint,
    },
    rules: {
      ...tsEslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "error",
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
    },
  },
  eslintConfigPrettier,
];
