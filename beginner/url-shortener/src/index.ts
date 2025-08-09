import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

const URLSchema = z.object({ url: z.string().url() });

// In-memory map
const urls = new Map<string, { url: string; createdAt: number; hits: number }>();

function genCode() {
  return Math.random().toString(36).slice(2, 8);
}

app.get('/health', (_: Request, res: Response) => res.json({ status: 'ok' }));

app.post('/shorten', (req: Request, res: Response) => {
  const parsed = URLSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  let code = genCode();
  while (urls.has(code)) code = genCode();
  urls.set(code, { url: parsed.data.url, createdAt: Date.now(), hits: 0 });
  res.status(201).json({ code, shortUrl: `http://localhost:4004/${code}` });
});

app.get('/:code', (req: Request, res: Response) => {
  const entry = urls.get(req.params.code);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  entry.hits += 1;
  res.redirect(entry.url);
});

app.get('/meta/:code', (req: Request, res: Response) => {
  const entry = urls.get(req.params.code);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json({ code: req.params.code, ...entry });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 4004);
  app.listen(port, () => console.log(`URL Shortener API listening on :${port}`));
}

export default app;
