const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { db } = require('../src/db');

describe('Auth routes', () => {
  const email = `test+${Date.now()}@example.com`;
  const password = 'password123';
  let token;

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should report email not existing', async () => {
    const res = await request(app).post('/api/auth/check-email').send({ email }).expect(200);
    expect(res.body).toHaveProperty('exists');
    expect(res.body.exists).toBe(false);
  });

  it('should sign up a new user', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test User', email, mobile: '1234567890', password })
      .expect(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    token = res.body.token;
  });

  it('should login the user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should access /api/auth/me with token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(email);
  });
});
