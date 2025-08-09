import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';

let server: any;

describe('Weather Proxy API', () => {
  beforeAll(async () => {
    server = app.listen(0);
  });
  afterAll(async () => {
    server.close();
  });

  it('health', async () => {
    const res = await request(server).get('/health');
    expect(res.statusCode).toBe(200);
  });

  it('returns weather for a city', async () => {
    const res = await request(server).get('/weather').query({ city: 'Paris' });
    expect(res.statusCode).toBe(200);
    expect(res.body.city).toBe('Paris');
    expect(typeof res.body.temperatureC).toBe('number');
  });
});
