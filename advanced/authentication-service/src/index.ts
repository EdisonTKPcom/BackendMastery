import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = Fastify({ logger: true });
app.register(cors, { origin: true });

// In-memory user store
// For demo only—use a real DB in production.

type User = { id: string; email: string; passwordHash: string };
const users = new Map<string, User>();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TTL_S = 60 * 15; // 15 minutes
const REFRESH_TTL_S = 60 * 60 * 24 * 7; // 7 days

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = RegisterSchema;

function issueTokens(userId: string) {
  const access = jwt.sign({ sub: userId, type: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TTL_S });
  const refresh = jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TTL_S });
  return { access, refresh, tokenType: 'Bearer', expiresIn: ACCESS_TTL_S };
}

app.get('/health', async () => ({ status: 'ok' }));

app.post('/register', async (req, reply) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid body' });
  const { email, password } = parsed.data;
  if ([...users.values()].some((u) => u.email === email)) {
    return reply.code(409).send({ error: 'Email already used' });
  }
  const id = Math.random().toString(36).slice(2, 10);
  const passwordHash = await bcrypt.hash(password, 10);
  users.set(id, { id, email, passwordHash });
  const tokens = issueTokens(id);
  return reply.code(201).send({ user: { id, email }, tokens });
});

app.post('/login', async (req, reply) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid body' });
  const { email, password } = parsed.data;
  const user = [...users.values()].find((u) => u.email === email);
  if (!user) return reply.code(401).send({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });
  const tokens = issueTokens(user.id);
  return reply.send({ user: { id: user.id, email: user.email }, tokens });
});

app.post('/refresh', async (req, reply) => {
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.type !== 'refresh') throw new Error('Not a refresh token');
    const tokens = issueTokens(payload.sub);
    return reply.send({ tokens });
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }
});

app.get('/me', async (req, reply) => {
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.type !== 'access') throw new Error('Not an access token');
    const user = users.get(payload.sub);
    if (!user) return reply.code(404).send({ error: 'Not found' });
    return reply.send({ id: user.id, email: user.email });
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 6001);
  app
    .listen({ port, host: '0.0.0.0' })
    .then(() => app.log.info(`Authentication Service listening on :${port}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}

export default app;
