import { Router, type IRouter, type Request, type Response } from 'express';
import { analyzeTextHybrid, analyzeTextLLMOnly } from '@/analysis/combineTextAnalyzer';
import { analyzeText } from '@/analysis/textAnalyzer';
import {
  getTextFallback,
  MOCK_TEXT_ANALYSIS,
} from '@/utils/fallbackResponses';

const router: IRouter = Router();

type AnalysisMode = 'hybrid' | 'llm' | 'rule';

function parseMode(query: Record<string, unknown>): AnalysisMode {
  const m = query?.mode;
  const s = Array.isArray(m) ? m[0] : m;
  if (s === 'llm' || s === 'rule') return s;
  return 'hybrid';
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body as { text?: string };
  const useMock = req.query.mock === '1' || process.env.LSJM_MOCK_MODE === '1';
  const mode = parseMode(req.query as Record<string, unknown>);

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "text" field' });
    return;
  }

  if (useMock) {
    res.json(MOCK_TEXT_ANALYSIS);
    return;
  }

  if (mode === 'rule') {
    try {
      const result = analyzeText(text);
      res.json(result);
    } catch (err) {
      const fallback = getTextFallback(err);
      res.status(200).json(fallback);
    }
    return;
  }

  try {
    const result =
      mode === 'llm' ? await analyzeTextLLMOnly(text) : await analyzeTextHybrid(text);
    res.json(result);
  } catch (llmErr) {
    try {
      const ruleResult = analyzeText(text);
      const fallbackReason =
        'LLM unavailable. Add DASHSCOPE_API_KEY and DASHSCOPE_BASE_URL to backend/.env to enable. Showing rule-based analysis.';
      res.json({
        ...ruleResult,
        reasons: [fallbackReason, ...ruleResult.reasons],
      });
    } catch {
      const fallback = getTextFallback(llmErr);
      res.status(200).json(fallback);
    }
  }
});

export default router;
