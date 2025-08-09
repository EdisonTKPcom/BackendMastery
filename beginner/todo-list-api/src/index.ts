import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

type Todo = {
	id: string;
	title: string;
	completed: boolean;
	createdAt: number;
	updatedAt: number;
};

const todos = new Map<string, Todo>();

const CreateSchema = z.object({
	title: z.string().min(1),
});

const UpdateSchema = z.object({
	title: z.string().min(1).optional(),
	completed: z.boolean().optional(),
});

app.get('/health', (_req: Request, res: Response) => {
	res.json({ status: 'ok' });
});

app.get('/todos', (_req: Request, res: Response) => {
	res.json(Array.from(todos.values()));
});

app.post('/todos', (req: Request, res: Response) => {
	const parse = CreateSchema.safeParse(req.body);
	if (!parse.success) return res.status(400).json({ error: 'Invalid body' });

	const id = Math.random().toString(36).slice(2, 10);
	const now = Date.now();
	const todo: Todo = {
		id,
		title: parse.data.title,
		completed: false,
		createdAt: now,
		updatedAt: now,
	};
	todos.set(id, todo);
	res.status(201).json(todo);
});

app.get('/todos/:id', (req: Request, res: Response) => {
	const t = todos.get(req.params.id);
	if (!t) return res.status(404).json({ error: 'Not found' });
	res.json(t);
});

app.patch('/todos/:id', (req: Request, res: Response) => {
	const t = todos.get(req.params.id);
	if (!t) return res.status(404).json({ error: 'Not found' });
	const parse = UpdateSchema.safeParse(req.body);
	if (!parse.success) return res.status(400).json({ error: 'Invalid body' });
	const now = Date.now();
	const updated: Todo = {
		...t,
		...parse.data,
		updatedAt: now,
	};
	todos.set(updated.id, updated);
	res.json(updated);
});

app.delete('/todos/:id', (req: Request, res: Response) => {
	const existed = todos.delete(req.params.id);
	if (!existed) return res.status(404).json({ error: 'Not found' });
	res.status(204).send();
});

if (require.main === module) {
	const port = Number(process.env.PORT || 4001);
	app.listen(port, () => console.log(`To-Do List API listening on :${port}`));
}

export default app;
