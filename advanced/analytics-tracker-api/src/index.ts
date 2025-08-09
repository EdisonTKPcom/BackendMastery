import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { LRUCache } from 'lru-cache';

const app = Fastify({ logger: true });

// Simple in-memory event store and counters
type Event = {
	type: string;
	userId?: string;
	sessionId?: string;
	timestamp: number; // epoch ms
	properties?: Record<string, unknown>;
};

const events: Event[] = [];
const counters = new Map<string, number>();

// Basic IP rate limiter (per minute)
const rateLimiter = new LRUCache<string, { count: number; windowStart: number }>({
	max: 5000,
	ttl: 1000 * 60 * 10, // hold entries for 10 minutes idle
});

function checkRate(ip: string, limit = 120, windowMs = 60_000) {
	const now = Date.now();
	const current = rateLimiter.get(ip);
	if (!current || now - current.windowStart >= windowMs) {
		rateLimiter.set(ip, { count: 1, windowStart: now });
		return true;
	}
	current.count += 1;
	rateLimiter.set(ip, current);
	return current.count <= limit;
}

// Schemas
const EventSchema = z.object({
	type: z.string().min(1),
	userId: z.string().optional(),
	sessionId: z.string().optional(),
	timestamp: z.number().int().nonnegative().optional(),
	properties: z.record(z.any()).optional(),
});

const IngestBodySchema = z.union([
	EventSchema,
	z.array(EventSchema).nonempty(),
]);

// Routes
app.get('/health', async () => ({ status: 'ok' }));

app.post('/events', async (req: FastifyRequest, reply: FastifyReply) => {
	const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
	if (!checkRate(ip)) {
		return reply.code(429).send({ error: 'Too Many Requests' });
	}
	const parse = IngestBodySchema.safeParse(req.body);
	if (!parse.success) {
		return reply.code(400).send({ error: 'Invalid body', details: parse.error.flatten() });
	}

	const payload = Array.isArray(parse.data) ? parse.data : [parse.data];
	const now = Date.now();
	for (const e of payload) {
		const evt: Event = {
			type: e.type,
			userId: e.userId,
			sessionId: e.sessionId,
			timestamp: e.timestamp ?? now,
			properties: e.properties,
		};
		events.push(evt);
		counters.set(evt.type, (counters.get(evt.type) || 0) + 1);
	}
	return reply.code(202).send({ accepted: payload.length });
});

app.get('/metrics', async (req: FastifyRequest) => {
	const url = new URL(req.url!, 'http://localhost');
	const sinceParam = url.searchParams.get('since');
	const since = sinceParam ? Number(sinceParam) : Date.now() - 60_000; // default last minute

	const totals: Record<string, number> = {};
	for (const [k, v] of counters.entries()) totals[k] = v;

	const recent = events.filter((e) => e.timestamp >= since);
	const byType: Record<string, number> = {};
	for (const e of recent) byType[e.type] = (byType[e.type] || 0) + 1;

	return { totals, recent: { since, byType, count: recent.length } };
});

// Start server when run directly
if (require.main === module) {
	const port = Number(process.env.PORT || 3000);
	app
		.listen({ port, host: '0.0.0.0' })
		.then(() => {
			app.log.info(`Analytics Tracker API listening on :${port}`);
		})
		.catch((err: unknown) => {
			app.log.error(err);
			process.exit(1);
		});
}

export default app;
