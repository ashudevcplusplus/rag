const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

const commonGlobals = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  fetch: 'readonly',
  performance: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
  NodeJS: 'readonly',
};

const commonRules = {
  // TypeScript specific
  '@typescript-eslint/explicit-function-return-type': [
    'warn',
    {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          args: 'after-used', // Only check args after the last used one
        },
      ],
      'no-unused-vars': 'off', // Use TypeScript version instead
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',

  // General code quality
  'prefer-const': 'error',
  'no-var': 'error',
  eqeqeq: ['error', 'always'],

  // Prettier integration
  'prettier/prettier': 'warn',
};

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: commonGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      // Warnings for development
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      ...commonRules,
    },
  },
  {
    files: ['test/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        ...commonGlobals,
        global: 'readonly',
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      // Allow console in test files
      'no-console': 'off',
      // Allow any in test files for mocking
      '@typescript-eslint/no-explicit-any': 'off',
      ...commonRules,
    },
  },
  prettierConfig,
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', 'coverage/**'],
  },
];
