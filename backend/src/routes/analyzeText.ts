import { Router, type IRouter, type Request, type Response } from 'express';
import { analyzeText } from '@/analysis/textAnalyzer';
import {
  getTextFallback,
  MOCK_TEXT_ANALYSIS,
} from '@/utils/fallbackResponses';

const router: IRouter = Router();

router.post('/', (req: Request, res: Response): void => {
  const { text } = req.body as { text?: string };
  const useMock = req.query.mock === '1' || process.env.LSJM_MOCK_MODE === '1';

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "text" field' });
    return;
  }

  if (useMock) {
    res.json(MOCK_TEXT_ANALYSIS);
    return;
  }

  try {
    const result = analyzeText(text);
    res.json(result);
  } catch (err) {
    const fallback = getTextFallback(err);
    res.status(200).json(fallback);
  }
});

export default router;
