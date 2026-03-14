import path from 'path';
import express from 'express';
import analyzeTextRouter from '@/routes/analyzeText';
import analyzeUrlRouter from '@/routes/analyzeUrl';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/analyze-text', analyzeTextRouter);
app.use('/analyze-url', analyzeUrlRouter);

const frontendPath = path.resolve(__dirname, '..', '..', 'frontend');
const sharedPath = path.resolve(__dirname, '..', '..', 'shared');
app.use('/shared', express.static(sharedPath));
app.use(express.static(frontendPath));
app.get('/', (_req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.listen(PORT, () => {
  console.log(`LSJM running at http://localhost:${PORT}`);
});
