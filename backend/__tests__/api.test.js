const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

describe('Basic API', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('GET /api should return running message', async () => {
    const res = await request(app).get('/api').expect(200);
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
  });
});
