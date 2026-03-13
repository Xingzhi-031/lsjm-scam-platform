import type { AnalysisResult } from '@/types/analysisTypes';

export function analyzeUrl(_url: string): AnalysisResult {
  return {
    riskScore: 0,
    riskLevel: 'low',
    signals: [],
    reasons: [],
    advice: [],
  };
}
