import { app, authRequest, publicRequest, testToken } from '../setup';

describe('AuthController (e2e)', () => {
  
  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await publicRequest()
        .post('/auth/login')
        .send({
          email: 'invalid@test.com',
          password: 'wrongpassword',
        });
      
      expect(response.status).toBe(401);
    });

    it('should return 400 for missing email', async () => {
      const response = await publicRequest()
        .post('/auth/login')
        .send({
          password: 'somepassword',
        });
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const response = await publicRequest()
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/register', () => {
    it('should return 400 for invalid email format', async () => {
      const response = await publicRequest()
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
        });
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for weak password', async () => {
      const response = await publicRequest()
        .post('/auth/register')
        .send({
          email: 'newuser@test.com',
          password: '123', // Too weak
          firstName: 'Test',
          lastName: 'User',
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 without token', async () => {
      const response = await publicRequest().get('/auth/me');
      expect(response.status).toBe(401);
    });

    it('should return user data with valid token', async () => {
      if (!testToken) {
        console.log('Skipping: No test token available');
        return;
      }
      
      const response = await authRequest().get('/auth/me');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email');
    });
  });
});
