import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';

let server: any;
const AUTH = { Authorization: 'Bearer dev-token' };

describe('Notes API', () => {
  beforeAll(async () => {
    server = app.listen(0);
  });
  afterAll(async () => {
    server.close();
  });

  it('requires auth', async () => {
    const res = await request(server).get('/notes');
    expect(res.statusCode).toBe(401);
  });

  it('CRUD flow with auth', async () => {
    const create = await request(server)
      .post('/notes')
      .set(AUTH)
      .set('content-type', 'application/json')
      .send({ title: 'First', content: 'hello' });
    expect(create.statusCode).toBe(201);
    const note = create.body;

    const list = await request(server).get('/notes').set(AUTH);
    expect(list.statusCode).toBe(200);
    expect(list.body.length).toBeGreaterThanOrEqual(1);

    const getOne = await request(server).get(`/notes/${note.id}`).set(AUTH);
    expect(getOne.statusCode).toBe(200);

    const patch = await request(server)
      .patch(`/notes/${note.id}`)
      .set(AUTH)
      .set('content-type', 'application/json')
      .send({ content: 'updated' });
    expect(patch.statusCode).toBe(200);
    expect(patch.body.content).toBe('updated');

    const del = await request(server).delete(`/notes/${note.id}`).set(AUTH);
    expect(del.statusCode).toBe(204);
  });
});
