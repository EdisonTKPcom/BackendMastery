import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';

let server: any;

describe('Chatroom REST API', () => {
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

  it('create room and post messages', async () => {
    const r = await request(server)
      .post('/rooms')
      .set('content-type', 'application/json')
      .send({ name: 'general' });
    expect(r.statusCode).toBe(201);
    const room = r.body;

    const m1 = await request(server)
      .post(`/rooms/${room.id}/messages`)
      .set('content-type', 'application/json')
      .send({ user: 'alice', text: 'Hello' });
    expect(m1.statusCode).toBe(201);

    const list = await request(server).get(`/rooms/${room.id}/messages`);
    expect(list.statusCode).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBe(1);
  });
});
