import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

const commonGlobals = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  NodeJS: 'readonly',
  URL: 'readonly',
  AbortController: 'readonly',
  TextDecoder: 'readonly',
  URLSearchParams: 'readonly',
};

const commonRules = {
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
      args: 'after-used',
    },
  ],
  'no-unused-vars': 'off',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  'prefer-const': 'error',
  'no-var': 'error',
  eqeqeq: ['error', 'always'],
  'prettier/prettier': 'warn',
};

export default [
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
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      ...commonRules,
    },
  },
  prettierConfig,
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.js', 'coverage/**'],
  },
];
