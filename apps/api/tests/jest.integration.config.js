module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testRegex: ['tests[/\\\\]e2e[/\\\\].*\\.spec\\.ts$'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
