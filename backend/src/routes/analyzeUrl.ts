import { Router, type IRouter, type Request, type Response } from 'express';
import { analyzeUrl } from '@/analysis/urlAnalyzer';

const router: IRouter = Router();

router.post('/', (req: Request, res: Response): void => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "url" field' });
    return;
  }
  const result = analyzeUrl(url);
  res.json(result);
});

export default router;
