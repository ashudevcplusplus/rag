module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  testMatch: ['**/?(*.)+(e2e.test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 120000,
  verbose: true,

  // Map workspace packages to their source
  moduleNameMapper: {
    '^@rag/types$': '<rootDir>/../packages/types/src/index.ts',
  },
};

