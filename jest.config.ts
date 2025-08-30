import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: [],
  globals: {
    'ts-jest': { tsconfig: 'tsconfig.spec.json' },
  }
};
export default config;
