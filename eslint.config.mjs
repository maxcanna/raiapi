// @ts-check

import js from "@eslint/js";
import globals from "globals";
import babelParser from "@babel/eslint-parser";
import reactPlugin from "eslint-plugin-react";

export default [
  // 1. Global ignores
  {
    ignores: ["node_modules/", "public/", "dist/", ".yarn/", ".pnp.*"],
  },

  // 2. ESLint Recommended base for all JS files (applied first)
  // This provides a good baseline. Specific configurations below will layer on top.
  js.configs.recommended,

  // 3. Configuration for root-level JS files (Node.js environment)
  // This includes .js files in the root directory (like index.js, raiapi.js, preact.config.js)
  // and also JavaScript files within the /test/ directory (like test/dreddHooks.js).
  {
    files: ["*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
      globals: {
        ...globals.node, // Defines Node.js global variables.
      },
    },
    rules: {
      // Translated from root .eslintrc
      "indent": ["error", 4, { "SwitchCase": 1, "VariableDeclarator": 1 }],
      "linebreak-style": ["error", "unix"], // In .eslintrc, 2 typically means "error" and implies "unix"
      "no-mixed-requires": ["error", { "grouping": true, "allowCall": false }],
      "one-var": ["error", "never"],
      "global-require": "error",
      "comma-style": ["error", "last"],
      "dot-notation": "off", // This rule was explicitly turned off (0) in .eslintrc
      // no-unused-vars and no-undef are part of js.configs.recommended, so they are active.
      // Re-declaring them here would just override if different settings were needed.
      "quote-props": ["error", "as-needed", { "unnecessary": true, "numbers": false }],
      "no-underscore-dangle": "error",
      "object-curly-spacing": ["error", "always"],
      "no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 1 }],
      // Rules from js.configs.recommended will also apply unless specifically overridden here.
    },
  },

  // 4. Specific configuration for Jest test file (raiapi.test.js)
  // This layers on top of the previous configuration if files match (which raiapi.test.js does).
  // It specifically adds Jest global variables.
  {
    files: ["raiapi.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest, // Adds Jest-specific global variables like 'test', 'expect', etc.
        ...globals.node, // Ensure Node globals are also present if not inherited clearly
      },
    },
    // Rules from the previous configuration object (for *.js) will still apply.
    // Specific Jest rules (e.g., from a jest plugin) could be added here if desired.
  },

  // 5. Configuration for src/ files (Preact/JSX components)
  {
    files: ["src/**/*.js", "src/**/*.jsx"], // Ensuring .jsx files are also covered
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      ecmaVersion: 2018, // Consistent with other parts
      sourceType: "module", // Standard for modern JS
      parser: babelParser, // Use @babel/eslint-parser for JSX and modern JS features in src
      parserOptions: {
        requireConfigFile: false, // Babel config is provided directly below
        babelOptions: {
          presets: ["@babel/preset-react"], // Essential for parsing JSX
        },
      },
      globals: {
        ...globals.browser, // Defines browser global variables like 'window', 'document'.
      },
    },
    rules: {
      // Start with recommended React rules and JSX runtime rules
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules, // For the new JSX transform (React 17+)

      // Rules translated or adapted from src/.eslintrc
      "comma-dangle": ["error", "always-multiline"],
      "dot-notation": "error", // Overrides "off" from the root config, enabling it for src files
      "one-var-declaration-per-line": ["error", "initializations"],

      // Overrides for src, differing from root config or js.recommended if necessary
      "indent": ["error", 2], // Common practice: 2 spaces for JSX and src files

      // Rules from js.configs.recommended (like no-unused-vars, no-undef) will apply.
      // react/jsx-uses-vars is typically included in reactPlugin.configs.recommended.
      // Explicitly keep object-curly-spacing and quote-props consistent if desired, or let them be.
      "object-curly-spacing": ["error", "always"],
      "quote-props": ["error", "as-needed"],
    },
    settings: {
      react: {
        version: "detect", // Automatically detect React version (works for Preact)
      },
    },
  }
];
