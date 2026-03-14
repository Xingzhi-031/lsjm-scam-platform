import { Router, type IRouter, type Request, type Response } from 'express';
import { analyzeUrl } from '@/analysis/urlAnalyzer';
import {
  getUrlFallback,
  MOCK_URL_ANALYSIS,
} from '@/utils/fallbackResponses';

const router: IRouter = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body as { url?: string };
  const useMock = req.query.mock === '1' || process.env.LSJM_MOCK_MODE === '1';

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "url" field' });
    return;
  }

  if (useMock) {
    res.json(MOCK_URL_ANALYSIS);
    return;
  }

  try {
    const result = await analyzeUrl(url);
    res.json(result);
  } catch (err) {
    const fallback = getUrlFallback(err);
    res.status(200).json(fallback);
  }
});

export default router;
