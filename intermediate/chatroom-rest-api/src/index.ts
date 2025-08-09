import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_: Request, res: Response) => res.json({ status: 'ok' }));

// In-memory chatrooms and messages
// rooms: { id, name }
// messages: { id, roomId, user, text, timestamp }

type Room = { id: string; name: string };
type Message = { id: string; roomId: string; user: string; text: string; timestamp: number };

const rooms = new Map<string, Room>();
const messages: Message[] = [];

const RoomCreate = z.object({ name: z.string().min(1) });
const MessageCreate = z.object({ user: z.string().min(1), text: z.string().min(1) });

app.get('/rooms', (_: Request, res: Response) => res.json(Array.from(rooms.values())));

app.post('/rooms', (req: Request, res: Response) => {
  const parsed = RoomCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const id = Math.random().toString(36).slice(2, 10);
  const room: Room = { id, name: parsed.data.name };
  rooms.set(id, room);
  res.status(201).json(room);
});

app.get('/rooms/:id/messages', (req: Request, res: Response) => {
  if (!rooms.has(req.params.id)) return res.status(404).json({ error: 'Room not found' });
  res.json(messages.filter((m) => m.roomId === req.params.id));
});

app.post('/rooms/:id/messages', (req: Request, res: Response) => {
  if (!rooms.has(req.params.id)) return res.status(404).json({ error: 'Room not found' });
  const parsed = MessageCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const id = Math.random().toString(36).slice(2, 10);
  const msg: Message = { id, roomId: req.params.id, user: parsed.data.user, text: parsed.data.text, timestamp: Date.now() };
  messages.push(msg);
  res.status(201).json(msg);
});

if (require.main === module) {
  const port = Number(process.env.PORT || 5001);
  app.listen(port, () => console.log(`Chatroom REST API listening on :${port}`));
}

export default app;
