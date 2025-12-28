module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test/unit', '<rootDir>/test/integration'],
  // Use 50% of available CPUs for parallel test execution
  maxWorkers: '50%',
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['<rootDir>/test/e2e'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  // Map workspace packages to their source
  moduleNameMapper: {
    '^@rag/text-utils$': '<rootDir>/../packages/text-utils/src/index.ts',
    '^@rag/types$': '<rootDir>/../packages/types/src/index.ts',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/scripts/**/*.ts',
    '!src/types/**/*.ts',
    '!src/repositories/index.ts', // Re-exports only
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],

  // Coverage thresholds - set to current baseline, can be increased over time
  // Current coverage: ~45% statements, ~40% branches, ~43% functions, ~45% lines
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
};
