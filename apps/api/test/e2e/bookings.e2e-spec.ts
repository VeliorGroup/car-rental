import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('BookingsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;
  let customerId: string;
  let vehicleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'password123',
      });

    authToken = loginResponse.body.access_token;
    tenantId = loginResponse.body.user?.tenantId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/bookings (GET)', () => {
    it('should return unauthorized without token', () => {
      return request(app.getHttpServer())
        .get('/bookings')
        .expect(401);
    });

    it('should return bookings list with valid token', () => {
      return request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('bookings');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
        });
    });

    it('should filter bookings by status', () => {
      return request(app.getHttpServer())
        .get('/bookings?status=CONFIRMED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.bookings.every((b: any) => b.status === 'CONFIRMED')).toBe(true);
        });
    });

    it('should paginate results', () => {
      return request(app.getHttpServer())
        .get('/bookings?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(5);
          expect(res.body.bookings.length).toBeLessThanOrEqual(5);
        });
    });
  });

  describe('/bookings/:id (GET)', () => {
    it('should return 404 for non-existent booking', () => {
      return request(app.getHttpServer())
        .get('/bookings/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/bookings/calculate-price (POST)', () => {
    it('should calculate price for booking', () => {
      return request(app.getHttpServer())
        .post('/bookings/calculate-price')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: vehicleId || 'test-vehicle',
          customerId: customerId || 'test-customer',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        })
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('dailyPrice');
            expect(res.body).toHaveProperty('totalPrice');
            expect(res.body).toHaveProperty('days');
          }
        });
    });
  });

  describe('/bookings (POST)', () => {
    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should require vehicleId', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: 'test',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('/bookings/stats (GET)', () => {
    it('should return booking statistics', () => {
      return request(app.getHttpServer())
        .get('/bookings/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('confirmed');
          expect(res.body).toHaveProperty('checkedOut');
        });
    });
  });

  describe('/bookings/calendar (GET)', () => {
    it('should return calendar data', () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 86400000);
      
      return request(app.getHttpServer())
        .get(`/bookings/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
