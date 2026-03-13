import type { AnalysisResult, RiskLevel } from '@/types/analysisTypes';

export function buildResult(
  riskScore: number,
  riskLevel: RiskLevel,
  signals: AnalysisResult['signals'],
  reasons: string[],
  advice: string[]
): AnalysisResult {
  return {
    riskScore,
    riskLevel,
    signals,
    reasons,
    advice,
  };
}
