import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';

let server: any;

describe('Bookshelf API', () => {
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

  it('create author and book, then fetch and delete', async () => {
    const a = await request(server)
      .post('/authors')
      .set('content-type', 'application/json')
      .send({ name: 'J. Doe' });
    expect(a.statusCode).toBe(201);
    const author = a.body;

    const b = await request(server)
      .post('/books')
      .set('content-type', 'application/json')
      .send({ title: 'My Book', authorId: author.id });
    expect(b.statusCode).toBe(201);
    const book = b.body;

    const get = await request(server).get(`/books/${book.id}`);
    expect(get.statusCode).toBe(200);
    expect(get.body.title).toBe('My Book');

    const del = await request(server).delete(`/books/${book.id}`);
    expect(del.statusCode).toBe(204);
  });
});
