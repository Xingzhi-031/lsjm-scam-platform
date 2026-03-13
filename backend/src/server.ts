import express from 'express';
import analyzeTextRouter from '@/routes/analyzeText';
import analyzeUrlRouter from '@/routes/analyzeUrl';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/analyze-text', analyzeTextRouter);
app.use('/analyze-url', analyzeUrlRouter);

app.listen(PORT, () => {
  console.log(`LSJM backend running at http://localhost:${PORT}`);
});
