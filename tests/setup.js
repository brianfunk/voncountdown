/**
 * Jest setup file - runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Mock environment variables for testing
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.DYNAMODB_TABLE = 'test-table';
process.env.TWITTER_API_KEY = 'test-api-key';
process.env.TWITTER_API_SECRET = 'test-api-secret';
process.env.TWITTER_ACCESS_TOKEN = 'test-access-token';
process.env.TWITTER_ACCESS_TOKEN_SECRET = 'test-access-token-secret';

// Increase timeout for async operations
jest.setTimeout(10000);
