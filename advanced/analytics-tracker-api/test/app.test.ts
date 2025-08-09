import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';

describe('Analytics Tracker API', () => {
	beforeAll(async () => {
		// Fastify can be tested without listen() using inject
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	it('health returns ok', async () => {
		const res = await app.inject({ method: 'GET', url: '/health' });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ status: 'ok' });
	});

	it('accepts single event', async () => {
		const res = await app.inject({
			method: 'POST',
			url: '/events',
			payload: { type: 'page_view', userId: 'u1' },
		});
		expect(res.statusCode).toBe(202);
		expect(res.json()).toEqual({ accepted: 1 });
	});

	it('accepts batch events and exposes metrics', async () => {
		const res1 = await app.inject({
			method: 'POST',
			url: '/events',
			payload: [
				{ type: 'click', sessionId: 's1' },
				{ type: 'click', sessionId: 's1' },
				{ type: 'signup' },
			],
		});
		expect(res1.statusCode).toBe(202);
		expect(res1.json()).toEqual({ accepted: 3 });

		const res2 = await app.inject({ method: 'GET', url: '/metrics' });
		expect(res2.statusCode).toBe(200);
		const body = res2.json();
		expect(body.totals).toBeTypeOf('object');
		expect(body.totals.click).toBeGreaterThanOrEqual(2);
		expect(body.recent.count).toBeGreaterThanOrEqual(3);
	});
});
