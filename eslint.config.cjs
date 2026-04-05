"use strict";

const js = require("@eslint/js");
const globals = require("globals");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = [
  { ignores: ["**/node_modules/**", "**/coverage/**"] },
  js.configs.recommended,
  {
    files: ["financedashboardbackend/src/**/*.js", "financedashboardbackend/test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["warn", "always", { null: "ignore" }],
      "prefer-const": "warn",
    },
  },
  eslintConfigPrettier,
];
