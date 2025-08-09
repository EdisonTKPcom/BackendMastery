import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory data store for authors and books

type Author = { id: string; name: string };
type Book = { id: string; title: string; authorId: string };

const authors = new Map<string, Author>();
const books = new Map<string, Book>();

const AuthorCreate = z.object({ name: z.string().min(1) });
const BookCreate = z.object({ title: z.string().min(1), authorId: z.string().min(1) });

app.get('/health', (_: Request, res: Response) => res.json({ status: 'ok' }));

// Authors CRUD (minimal)
app.get('/authors', (_: Request, res: Response) => {
  res.json(Array.from(authors.values()));
});

app.post('/authors', (req: Request, res: Response) => {
  const parse = AuthorCreate.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body' });
  const id = Math.random().toString(36).slice(2, 10);
  const a: Author = { id, name: parse.data.name };
  authors.set(id, a);
  res.status(201).json(a);
});

// Books CRUD (minimal)
app.get('/books', (_: Request, res: Response) => {
  res.json(Array.from(books.values()));
});

app.post('/books', (req: Request, res: Response) => {
  const parse = BookCreate.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body' });
  if (!authors.has(parse.data.authorId)) return res.status(400).json({ error: 'Unknown authorId' });
  const id = Math.random().toString(36).slice(2, 10);
  const b: Book = { id, title: parse.data.title, authorId: parse.data.authorId };
  books.set(id, b);
  res.status(201).json(b);
});

app.get('/books/:id', (req: Request, res: Response) => {
  const b = books.get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  res.json(b);
});

app.delete('/books/:id', (req: Request, res: Response) => {
  const ok = books.delete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

if (require.main === module) {
  const port = Number(process.env.PORT || 4003);
  app.listen(port, () => console.log(`Bookshelf API listening on :${port}`));
}

export default app;
