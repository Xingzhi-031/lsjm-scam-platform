import type { AnalysisResult } from '@/types/analysisTypes';

export function analyzeText(_text: string): AnalysisResult {
  return {
    riskScore: 0,
    riskLevel: 'low',
    signals: [],
    reasons: [],
    advice: [],
  };
}
