import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';

let server: any;

describe('To-Do List API', () => {
  beforeAll(async () => {
    // bind to an ephemeral port for supertest
    server = app.listen(0);
  });

  afterAll(async () => {
    server.close();
  });

  it('GET /health', async () => {
    const res = await request(server).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('CRUD flow', async () => {
    // create
    const create = await request(server)
      .post('/todos')
      .send({ title: 'Learn Vitest' })
      .set('content-type', 'application/json');
    expect(create.statusCode).toBe(201);
    const todo = create.body;
    expect(todo.title).toBe('Learn Vitest');

    // read
    const read = await request(server).get(`/todos/${todo.id}`);
    expect(read.statusCode).toBe(200);
    expect(read.body.id).toBe(todo.id);

    // update
    const patch = await request(server)
      .patch(`/todos/${todo.id}`)
      .send({ completed: true })
      .set('content-type', 'application/json');
    expect(patch.statusCode).toBe(200);
    expect(patch.body.completed).toBe(true);

    // list
    const list = await request(server).get('/todos');
    expect(list.statusCode).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.find((t: any) => t.id === todo.id)).toBeTruthy();

    // delete
    const del = await request(server).delete(`/todos/${todo.id}`);
    expect(del.statusCode).toBe(204);

    const missing = await request(server).get(`/todos/${todo.id}`);
    expect(missing.statusCode).toBe(404);
  });
});
