import { Router, type IRouter, type Request, type Response } from 'express';
import { analyzeUrl } from '@/analysis/urlAnalyzer';

const router: IRouter = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "url" field' });
    return;
  }
  const result = await analyzeUrl(url);
  res.json(result);
});

export default router;
