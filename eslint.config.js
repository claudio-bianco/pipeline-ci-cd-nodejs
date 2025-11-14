// eslint.config.js (Flat Config – ESLint v9+)
import js from '@eslint/js';
import globals from 'globals';

export default [
  // Ignorar artefatos e pastas não-fonte
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      '*.log',
      'db.json'
    ],
  },

  // Regras base aplicadas a tudo
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,   // globais de Node
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Convenções gerais
      'no-console': 'off',                                // liberado por padrão
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'eqeqeq': ['error', 'smart'],
      'curly': ['error', 'all'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
    },
  },

  // Regras mais rígidas para código de aplicação
  {
    files: ['src/**/*.js', 'src/**/*.mjs'],
    rules: {
      // Em produção você pode trocar para 'warn' ou 'error'
      'no-console': ['warn', { allow: ['warn', 'error'] }], // log normal desestimulado; warn/error ok
      'no-implicit-coercion': ['error', { allow: ['!!'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'no-return-assign': ['error', 'always'],
      'object-shorthand': ['error', 'always'],
    },
  },

  // Regras específicas para testes (Jest)
  {
    files: ['test/**/*.spec.*', '__tests__/**/*.test.*'],
    languageOptions: {
      globals: {
        ...globals.jest,   // habilita describe/it/expect etc.
      },
    },
    rules: {
      // Em testes, permitir console para debug
      'no-console': 'off',
      // Evitar falsos positivos em mocks/fixtures
      'no-unused-expressions': 'off',
      // Parâmetros não usados são ok em testes (ex.: (_, res))
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
