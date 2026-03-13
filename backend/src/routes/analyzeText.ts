import { Router, type IRouter, type Request, type Response } from 'express';
import { analyzeText } from '@/analysis/textAnalyzer';

const router: IRouter = Router();

router.post('/', (req: Request, res: Response): void => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "text" field' });
    return;
  }
  const result = analyzeText(text);
  res.json(result);
});

export default router;
