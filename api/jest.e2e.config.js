module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  testMatch: ['**/?(*.)+(e2e.test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Map workspace packages to their source
  moduleNameMapper: {
    '^@rag/text-utils$': '<rootDir>/../packages/text-utils/src/index.ts',
    '^@rag/types$': '<rootDir>/../packages/types/src/index.ts',
  },
  testTimeout: 120000,
  verbose: true,
};

