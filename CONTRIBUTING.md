# Contributing to Car Rental Platform

Thank you for your interest in contributing to the Car Rental SaaS Platform!

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)

## Code of Conduct

Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL 15+
- Redis 7+
- pnpm or npm

### Setup

1. Clone the repository
```bash
git clone https://github.com/your-org/carrental.git
cd carrental
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

4. Run database migrations
```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
```

5. Start development servers
```bash
npm run dev
```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### Example
```bash
git checkout -b feature/add-vehicle-search
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over types
- Use meaningful variable names
- Document complex logic with comments

### Backend (NestJS)

```typescript
// Good
@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async findAll(tenantId: string, filters: BookingFilterDto) {
    // Implementation
  }
}

// Bad
@Injectable()
export class BookingsService {
  constructor(private p: PrismaService, private c: RedisCacheService) {}
  async f(t: string, f: any) { /* ... */ }
}
```

### Frontend (Next.js)

```typescript
// Good
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function BookingForm() {
  const t = useTranslations('Bookings');
  const [loading, setLoading] = useState(false);
  // ...
}

// Bad
export default function BookingForm() {
  const [l, setL] = useState(false);
  // ...
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run API tests
npm run test:api

# Run Web tests
npm run test:web

# Run with coverage
npm run test:cov
```

### Writing Tests

```typescript
describe('BookingsService', () => {
  let service: BookingsService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    
    service = module.get<BookingsService>(BookingsService);
  });

  it('should create a booking', async () => {
    const result = await service.create(tenantId, createDto, userId);
    expect(result).toBeDefined();
    expect(result.status).toBe('CONFIRMED');
  });
});
```

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

### Examples

```bash
feat(bookings): add calendar view for bookings
fix(auth): resolve token refresh issue
docs(api): update swagger documentation
test(vehicles): add unit tests for VehiclesService
```

## Pull Requests

### Before Submitting

1. ✅ Tests pass locally
2. ✅ No linting errors
3. ✅ Code is documented
4. ✅ Changelog updated (if applicable)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)
```

### Review Process

1. Create PR against `develop` branch
2. Wait for CI checks to pass
3. Request review from maintainers
4. Address feedback
5. Squash and merge

## Questions?

Feel free to open an issue for any questions or suggestions!
