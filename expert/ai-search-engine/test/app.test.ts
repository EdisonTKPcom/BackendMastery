import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';

let server: any;

describe('AI Search Engine', () => {
  beforeAll(async () => {
    server = await app.listen({ port: 0 });
  });
  afterAll(async () => {
    await app.close();
  });

  it('indexes and searches', async () => {
    const put1 = await app.inject({ method: 'PUT', url: '/docs/1', payload: { id: '1', text: 'hello world' } });
    expect(put1.statusCode).toBe(204);

    const put2 = await app.inject({ method: 'PUT', url: '/docs/2', payload: { id: '2', text: 'hello ai search' } });
    expect(put2.statusCode).toBe(204);

    const search = await app.inject({ method: 'GET', url: '/search?q=ai' });
    expect(search.statusCode).toBe(200);
    const body = search.json();
    expect(body.results[0].id).toBe('2');
  });
});
