import { Router, type IRouter, type Request, type Response } from 'express';
import { analyzeTextHybrid } from '@/analysis/combineTextAnalyzer';
import { analyzeText } from '@/analysis/textAnalyzer';
import { analyzeUrl } from '@/analysis/urlAnalyzer';
import { getTextFallback } from '@/utils/fallbackResponses';
import type { AnalysisResult } from '@/types/analysisTypes';

const router: IRouter = Router();

const EMPTY_PAGE_RESULT: AnalysisResult = {
  riskScore: 0,
  riskLevel: 'low',
  signals: [],
  reasons: ['No content provided.'],
  advice: [],
};

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { text = '', url = '' } = req.body as { text?: string; url?: string };

  const textStr = typeof text === 'string' ? text.trim() : '';
  const urlStr = typeof url === 'string' ? url.trim() : '';

  if (!textStr && !urlStr) {
    res.status(400).json({ error: 'At least one of "text" or "url" is required.' });
    return;
  }

  const runText = textStr.length > 0;
  const runUrl = urlStr.length > 0 && (urlStr.startsWith('http://') || urlStr.startsWith('https://'));

  let textResult: AnalysisResult = EMPTY_PAGE_RESULT;
  let urlResult: AnalysisResult = EMPTY_PAGE_RESULT;

  const [resText, resUrl] = await Promise.all([
    runText
      ? analyzeTextHybrid(textStr).catch((err) => {
          try {
            return Promise.resolve(analyzeText(textStr));
          } catch {
            return Promise.resolve(getTextFallback(err));
          }
        })
      : Promise.resolve(EMPTY_PAGE_RESULT),
    runUrl
      ? analyzeUrl(urlStr).catch((err) => ({
          ...EMPTY_PAGE_RESULT,
          reasons: ['URL analysis failed.', err instanceof Error ? err.message : 'Unknown error'],
        }))
      : Promise.resolve(EMPTY_PAGE_RESULT),
  ]);

  textResult = resText;
  urlResult = resUrl;

  res.json({ text: textResult, url: urlResult });
});

export default router;
