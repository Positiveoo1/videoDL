module.exports = {
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['**/server.test.js'],
      collectCoverageFrom: ['server.js']
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['**/script.test.js'],
      collectCoverageFrom: ['script.js']
    }
  ],
  collectCoverageFrom: [
    'server.js',
    'script.js',
    '!node_modules/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  verbose: true,
  bail: false
};
