---
name: testing
description: Pattern Jest e NestJS Testing Module per Car Rental. Usa quando scrivi unit test, mock PrismaService, o implementi test suite per service e controller NestJS.
---

# Testing — Car Rental

## Setup TestingModule

```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisCacheService, useValue: mockCacheService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => jest.clearAllMocks());
});
```

## Mock PrismaService

```typescript
const mockPrismaService = {
  booking: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  vehicle: { findFirst: jest.fn(), update: jest.fn() },
  customer: { findFirst: jest.fn() },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};
```

## Mock servizi comuni

```typescript
const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  deletePattern: jest.fn().mockResolvedValue(undefined),
  getOrCompute: jest.fn().mockImplementation((key, fn) => fn()),
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn().mockResolvedValue(undefined),
};

const mockQueueService = {
  add: jest.fn().mockResolvedValue(undefined),
  process: jest.fn(),
};

const mockStorageService = {
  uploadBuffer: jest.fn().mockResolvedValue('file-key'),
  getPresignedUrl: jest.fn().mockResolvedValue('https://example.com/file'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

const mockPdfService = {
  generateContract: jest.fn().mockResolvedValue(Buffer.from('pdf')),
};

const mockMetricsService = { recordEvent: jest.fn() };
const mockEmailService = { sendBookingConfirmation: jest.fn() };
```

## Fixture standard

```typescript
const mockTenant = {
  id: 'tenant-1',
  companyName: 'Test Company',
  isActive: true,
  subdomain: 'test',
};
const mockUser = { id: 'user-1', tenantId: 'tenant-1', email: 'user@test.com' };
const mockCustomer = {
  id: 'customer-1', tenantId: 'tenant-1',
  firstName: 'John', lastName: 'Doe',
  email: 'customer@test.com', status: 'ACTIVE',
};
const mockVehicle = {
  id: 'vehicle-1', tenantId: 'tenant-1',
  licensePlate: 'AB123CD', brand: 'Fiat', model: '500',
  status: 'AVAILABLE', dailyPrice: new Decimal(50),
};
const mockBooking = {
  id: 'booking-1', tenantId: 'tenant-1',
  vehicleId: 'vehicle-1', customerId: 'customer-1',
  status: 'CONFIRMED', totalAmount: new Decimal(150),
};
```

## Struttura test per ogni metodo

```typescript
describe('create', () => {
  it('should create a booking successfully', async () => {
    mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
    mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
    mockPrismaService.booking.create.mockResolvedValue(mockBooking);

    const result = await service.create('tenant-1', createDto, 'user-1');

    expect(result).toEqual(mockBooking);
    expect(mockAuditService.log).toHaveBeenCalledWith('tenant-1', 'CREATE', 'Booking', 'booking-1', 'user-1');
  });

  it('should throw NotFoundException when vehicle not found', async () => {
    mockPrismaService.vehicle.findFirst.mockResolvedValue(null);
    await expect(service.create('tenant-1', createDto, 'user-1'))
      .rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when vehicle not available', async () => {
    mockPrismaService.vehicle.findFirst.mockResolvedValue({ ...mockVehicle, status: 'RENTED' });
    await expect(service.create('tenant-1', createDto, 'user-1'))
      .rejects.toThrow(BadRequestException);
  });
});
```
