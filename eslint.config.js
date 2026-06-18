// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  // No lintar generados / vendor / caché (Vite deps, build de Angular, etc.).
  {
    ignores: [
      'dist/**',
      '.angular/**',
      'coverage/**',
      'node_modules/**',
      '**/*.spec.ts', // los specs tienen su propio estilo (mocks, any, fixtures)
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],

      // ── Calibración pragmática del gate ──────────────────────────────────
      // Filosofía: lo que delata un BUG o un problema de a11y = error (bloquea
      // CI). Lo puramente ESTILÍSTICO o inherente a código de plantilla genérica
      // (que maneja entidades arbitrarias) = warning (no bloquea, pero queda
      // visible). Así el gate atrapa regresiones reales sin frenar el desarrollo
      // por preferencias de estilo.

      // `any` es legítimo en el núcleo genérico (data-table, base-crud, smart-
      // select, relationship-dialog, api.model…): tipan entidades arbitrarias
      // de cada proyecto descendiente. Tiparlo todo no aporta valor real → warn.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Constructor DI vs inject(): preferencia de estilo, ambos válidos → warn.
      '@angular-eslint/prefer-inject': 'warn',
      // Funciones vacías intencionales (callbacks no-op de ControlValueAccessor,
      // handlers placeholder): permitidas con comentario; el resto → warn.
      '@typescript-eslint/no-empty-function': 'warn',
      // Args/vars con prefijo `_` = "intencionalmente sin usar" (convención).
      // Hooks de plantilla como getDrawerTitle(_row) los usan a propósito.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // a11y real (foco, teclado, labels): se mantiene en error.
    },
  },
]);
