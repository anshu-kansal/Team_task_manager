const request = require('supertest');
const app = require('../src/app');

describe('Basic API', () => {
  it('GET /api should return running message', async () => {
    const res = await request(app).get('/api').expect(200);
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
  });
});
