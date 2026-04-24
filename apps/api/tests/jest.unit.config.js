module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testRegex: ['tests[/\\\\]unit[/\\\\].*\\.spec\\.ts$'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  passWithNoTests: true,
};
