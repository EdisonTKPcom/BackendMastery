import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

// For this demo proxy, we mock the upstream call.
// Real integration: fetch() to OpenWeatherMap, pick fields, return minimal payload.
const QuerySchema = z.object({ city: z.string().min(1) });

app.get('/health', (_: Request, res: Response) => res.json({ status: 'ok' }));

app.get('/weather', (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse({ city: req.query.city });
  if (!parsed.success) return res.status(400).json({ error: 'city is required' });

  // Mocked data; replace with real API call if desired (and env API key)
  const { city } = parsed.data;
  const temperature = 20 + Math.round(Math.random() * 10); // 20-30C
  const conditions = ['clear', 'cloudy', 'rain', 'windy'][Math.floor(Math.random() * 4)];

  res.json({ city, temperatureC: temperature, conditions });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 4005);
  app.listen(port, () => console.log(`Weather Proxy API listening on :${port}`));
}

export default app;
