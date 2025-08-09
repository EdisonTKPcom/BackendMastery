import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';

let server: any;

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Authentication Service', () => {
  beforeAll(async () => {
    server = await app.listen({ port: 0 });
  });
  afterAll(async () => {
    await app.close();
  });

  it('register, login, refresh, me', async () => {
    const email = `u_${Date.now()}@ex.com`;
    const password = 'secret123';

    const reg = await app.inject({ method: 'POST', url: '/register', payload: { email, password } });
    expect(reg.statusCode).toBe(201);
    const regBody = reg.json();
    expect(regBody.user.email).toBe(email);

    const login = await app.inject({ method: 'POST', url: '/login', payload: { email, password } });
    expect(login.statusCode).toBe(200);
    const { tokens } = login.json();

    const me = await app.inject({ method: 'GET', url: '/me', headers: authHeader(tokens.access) });
    expect(me.statusCode).toBe(200);
    const meBody = me.json();
    expect(meBody.email).toBe(email);

    const refresh = await app.inject({ method: 'POST', url: '/refresh', headers: authHeader(tokens.refresh) });
    expect(refresh.statusCode).toBe(200);
  });
});
