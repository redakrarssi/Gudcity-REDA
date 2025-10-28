// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.APP_URL = 'http://localhost:3000';

// Global before and after hooks
beforeAll(() => {
  console.log('Starting tests...');
  // You can add global setup here like connecting to a test database
});

afterAll(() => {
  console.log('All tests completed');
  // You can add global teardown here
});

// Silence console.log during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error and warn for debugging tests
  error: console.error,
  warn: console.warn,
}; 