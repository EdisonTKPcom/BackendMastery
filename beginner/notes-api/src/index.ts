import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

// Extremely simple bearer token auth for demo purposes
const TOKEN = process.env.NOTES_API_TOKEN || 'dev-token';

function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (token !== TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  (req as any).userId = 'demo-user';
  next();
}

app.get('/health', (_: Request, res: Response) => res.json({ status: 'ok' }));

// In-memory notes per user
// Note: in real apps, use a DB.

type Note = {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

const notes = new Map<string, Note>();

const CreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(''),
});

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});

app.get('/notes', auth, (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const list = Array.from(notes.values()).filter((n) => n.userId === userId);
  res.json(list);
});

app.post('/notes', auth, (req: Request, res: Response) => {
  const parse = CreateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body' });
  const id = Math.random().toString(36).slice(2, 10);
  const now = Date.now();
  const userId = (req as any).userId as string;
  const note: Note = {
    id,
    userId,
    title: parse.data.title,
    content: parse.data.content,
    createdAt: now,
    updatedAt: now,
  };
  notes.set(id, note);
  res.status(201).json(note);
});

app.get('/notes/:id', auth, (req: Request, res: Response) => {
  const n = notes.get(req.params.id);
  const userId = (req as any).userId as string;
  if (!n || n.userId !== userId) return res.status(404).json({ error: 'Not found' });
  res.json(n);
});

app.patch('/notes/:id', auth, (req: Request, res: Response) => {
  const n = notes.get(req.params.id);
  const userId = (req as any).userId as string;
  if (!n || n.userId !== userId) return res.status(404).json({ error: 'Not found' });
  const parse = UpdateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body' });
  const now = Date.now();
  const updated: Note = { ...n, ...parse.data, updatedAt: now };
  notes.set(updated.id, updated);
  res.json(updated);
});

app.delete('/notes/:id', auth, (req: Request, res: Response) => {
  const n = notes.get(req.params.id);
  const userId = (req as any).userId as string;
  if (!n || n.userId !== userId) return res.status(404).json({ error: 'Not found' });
  notes.delete(n.id);
  res.status(204).send();
});

if (require.main === module) {
  const port = Number(process.env.PORT || 4002);
  app.listen(port, () => console.log(`Notes API listening on :${port}`));
}

export default app;
