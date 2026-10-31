// ESLint v9 flat config (migrat din .eslintrc.js).
// Dependintele erau deja compatibile cu ESLint v9 (eslint ^9, @typescript-eslint ^8,
// eslint-config-prettier ^10, eslint-plugin-prettier ^5) — lipsea doar acest fisier in
// formatul flat. Pastreaza aceleasi reguli ca vechiul .eslintrc.js. Regula
// `@typescript-eslint/interface-name-prefix` a fost eliminata din @typescript-eslint v8,
// deci nu mai este referita aici (altfel ESLint arunca eroare).
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'eslint.config.js',
      '.eslintrc.js',
    ],
  },
  // Plugin + parser + reguli recomandate @typescript-eslint (format flat)
  ...tsPlugin.configs['flat/recommended'],
  // Integrare Prettier (ruleaza Prettier ca regula ESLint + dezactiveaza conflictele)
  prettierRecommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Variabile/importuri nefolosite => avertisment, nu eroare (consecvent cu stilul
      // proiectului). Prefixul `_` marcheaza ceva intentionat neutilizat (ex: destructurare
      // pentru a omite campuri) si este ignorat.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
