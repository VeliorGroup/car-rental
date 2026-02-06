import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TenantMiddleware } from '../src/common/middleware/tenant.middleware';
import * as request from 'supertest';

export let app: INestApplication;
export let testToken: string;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  
  // Apply same pipes as in main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Apply CORS similar to main.ts but allow all for testing
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Apply tenant middleware for testing
  const tenantMiddleware = app.get(TenantMiddleware);
  app.use(tenantMiddleware.use.bind(tenantMiddleware));
  
  await app.init();

  // Get auth token for testing (login with test user)
  try {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
      });
    
    if (loginResponse.body.access_token) {
      testToken = loginResponse.body.access_token;
      console.log('✅ Test auth token obtained');
    } else {
      console.log('⚠️ No test user found, tests requiring auth will be skipped');
    }
  } catch (error) {
    console.log('⚠️ Auth endpoint not available for testing');
  }
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

// Helper function for authenticated requests
export function authRequest() {
  return {
    get: (url: string) => 
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${testToken}`),
    post: (url: string) => 
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${testToken}`),
    put: (url: string) => 
      request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${testToken}`),
    patch: (url: string) => 
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${testToken}`),
    delete: (url: string) => 
      request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${testToken}`),
  };
}

// Helper for public requests (no auth)
export function publicRequest() {
  return request(app.getHttpServer());
}
