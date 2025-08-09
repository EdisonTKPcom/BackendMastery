import Fastify from 'fastify';
import { z } from 'zod';

const app = Fastify({ logger: true });

// Simple in-memory TF-IDF index
// docs: Map<docId, text>
// inverted: term -> Map<docId, tf>
// idf: term -> idf

type Doc = { id: string; text: string };
const docs = new Map<string, string>();
const inverted = new Map<string, Map<string, number>>();
const idf = new Map<string, number>();

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function rebuildIdf() {
  const N = docs.size || 1;
  for (const [term, postings] of inverted.entries()) {
    const df = postings.size || 1;
    idf.set(term, Math.log(N / df));
  }
}

function indexDoc(id: string, text: string) {
  docs.set(id, text);
  const terms = tokenize(text);
  const tf = new Map<string, number>();
  for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
  for (const [term, freq] of tf.entries()) {
    let postings = inverted.get(term);
    if (!postings) {
      postings = new Map();
      inverted.set(term, postings);
    }
    postings.set(id, freq);
  }
  rebuildIdf();
}

function score(query: string): Array<{ id: string; score: number }> {
  const qTokens = tokenize(query);
  const qTf = new Map<string, number>();
  for (const t of qTokens) qTf.set(t, (qTf.get(t) || 0) + 1);

  const docScores = new Map<string, number>();

  for (const [term, qf] of qTf.entries()) {
    const termIdf = idf.get(term) || 0;
    const postings = inverted.get(term);
    if (!postings) continue;
    for (const [docId, dTf] of postings.entries()) {
      const s = (docScores.get(docId) || 0) + qf * termIdf * dTf * termIdf;
      docScores.set(docId, s);
    }
  }

  return Array.from(docScores.entries())
    .map(([id, s]) => ({ id, score: s }))
    .sort((a, b) => b.score - a.score);
}

const PutDocSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });

app.get('/health', async () => ({ status: 'ok' }));

app.put('/docs/:id', async (req, reply) => {
  const parsed = PutDocSchema.safeParse({ id: req.params['id'], ...(req.body as any) });
  if (!parsed.success) return reply.code(400).send({ error: 'Invalid body' });
  indexDoc(parsed.data.id, parsed.data.text);
  return reply.code(204).send();
});

app.get('/search', async (req, reply) => {
  const q = (req.query as any).q as string | undefined;
  if (!q) return reply.code(400).send({ error: 'Missing q' });
  const results = score(q).slice(0, 10);
  return { results };
});

if (require.main === module) {
  const port = Number(process.env.PORT || 7001);
  app
    .listen({ port, host: '0.0.0.0' })
    .then(() => app.log.info(`AI Search Engine listening on :${port}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}

export default app;
