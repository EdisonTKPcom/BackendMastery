import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';

let server: any;

describe('URL Shortener', () => {
  beforeAll(async () => {
    server = app.listen(0);
  });
  afterAll(async () => {
    server.close();
  });

  it('shortens and redirects', async () => {
    const create = await request(server)
      .post('/shorten')
      .set('content-type', 'application/json')
      .send({ url: 'https://example.com' });
    expect(create.statusCode).toBe(201);
    const { code } = create.body;

    const meta = await request(server).get(`/meta/${code}`);
    expect(meta.statusCode).toBe(200);

    const redirect = await request(server).get(`/${code}`).redirects(0);
    expect(redirect.statusCode).toBe(302);
    expect(redirect.headers.location).toBe('https://example.com');
  });
});
