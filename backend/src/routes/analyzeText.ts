import { Router, type IRouter, type Request, type Response } from 'express';
import { analyzeTextHybrid } from '@/analysis/combineTextAnalyzer';
import { analyzeText } from '@/analysis/textAnalyzer';
import {
  getTextFallback,
  MOCK_TEXT_ANALYSIS,
} from '@/utils/fallbackResponses';

const router: IRouter = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
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
    const result = await analyzeTextHybrid(text);
    res.json(result);
  } catch (llmErr) {
    try {
      const ruleResult = analyzeText(text);
      res.json(ruleResult);
    } catch {
      const fallback = getTextFallback(llmErr);
      res.status(200).json(fallback);
    }
  }
});

export default router;
