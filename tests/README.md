# Testing Guide

## Test Structure

```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests for routes/APIs
├── helpers/        # Test utilities and mocks
└── fixtures/       # Test data fixtures
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (TDD workflow)
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Writing Tests

### Unit Tests
Test individual functions in isolation with mocks.

### Integration Tests
Test routes and API endpoints using Supertest.

### Mocking External Services
Use helpers in `tests/helpers/mocks.js` to mock:
- AWS DynamoDB
- Twitter API
- Other external services

## Test Coverage Goals

- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%
