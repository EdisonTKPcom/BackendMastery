# Analytics Tracker API

Minimal event ingestion service built with Fastify + TypeScript.

## Endpoints

- GET /health → { status: "ok" }
- POST /events → Accepts one event or a batch, returns { accepted: n }
	- Body (single): { type: string, userId?, sessionId?, timestamp?, properties? }
	- Body (batch): [ ...single ] (non-empty)
- GET /metrics?since=epochMs → Totals and recent counts since timestamp

Notes:
- Basic per-IP rate limit: 120 requests/minute.
- Data is stored in-memory (for learning/demo). Not for production.

## Quick start

Dev server:

```bash
npm i
npm run dev
```

Test suite:

```bash
npm test
```

Example requests:

```bash
curl -s http://localhost:3000/health

curl -s -X POST http://localhost:3000/events \
	-H 'content-type: application/json' \
	-d '{"type":"page_view","userId":"u1"}'

curl -s -X POST http://localhost:3000/events \
	-H 'content-type: application/json' \
	-d '[{"type":"click"},{"type":"signup"}]'

curl -s "http://localhost:3000/metrics?since=$(($(date +%s%3N)-60000))"
```

## Structure

- src/index.ts – Fastify app and routes
- test/app.test.ts – Vitest tests using inject()
- tsconfig.json – TS compiler config
- package.json – scripts and dependencies

## Next steps

- Persist events to a queue (e.g., Kafka/RabbitMQ) or DB.
- Add API key auth and per-project tokens.
- Export to CSV/Parquet and a /query endpoint for aggregations.
