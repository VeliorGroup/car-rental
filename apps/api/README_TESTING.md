# 🧪 Testing Guide

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup test database:**
   - Create a test database: `createdb car_rental_test`
   - Run migrations: `npm run prisma:migrate`

3. **Configure test environment:**
   ```bash
   cp .env.test.example .env.test
   # Edit .env.test with your test database credentials
   ```

## Running Tests

### Unit Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:cov
```

### E2E Tests
```bash
npm run test:e2e
```

## Test Structure

```
apps/api/
├── src/
│   ├── **/*.spec.ts          # Unit tests (co-located with source)
│   └── ...
├── test/
│   ├── setup.ts              # Test setup and helpers
│   ├── jest-e2e.json         # E2E test configuration
│   └── e2e/
│       └── *.e2e-spec.ts    # E2E tests
└── jest.config.js            # Unit test configuration
```

## Coverage Goals

- **Current Target:** 50% coverage
- **Future Target:** 70%+ coverage

## Writing Tests

### Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should do something', () => {
    const result = service.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

### E2E Test Example

```typescript
import { publicRequest, authRequest } from '../setup';

describe('Auth (e2e)', () => {
  it('/auth/login (POST)', () => {
    return publicRequest()
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('access_token');
      });
  });
});
```

## Test Coverage

Current test coverage includes:

- ✅ Tenant Middleware
- ✅ JWT Strategy
- ✅ Admin Auth Guard
- ✅ Throttle Custom Guard
- ✅ Env Schema Validation
- ✅ Redis Cache Service

## Notes

- Tests use a separate test database
- E2E tests require a running database
- Mock external services (email, SMS, payment) in unit tests
- Use test fixtures for consistent test data
