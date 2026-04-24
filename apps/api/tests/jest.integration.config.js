module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testRegex: ['tests[/\\\\](integration|e2e)[/\\\\].*\\.spec\\.ts$'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }] },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sneakereco/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@sneakereco/db$': '<rootDir>/../../packages/db/src/index.ts',
  },
};
