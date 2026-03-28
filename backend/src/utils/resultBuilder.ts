import type { AnalysisResult, RiskLevel, RiskSignal } from '@/types/analysisTypes';

function normalizeRiskScore(score: number): number {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function getRiskLevel(score: number): RiskLevel {
  if (score === 100) return 'critical';
  if (score >= 67) return 'high';
  if (score >= 34) return 'medium';
  return 'low';
}

/** URL-specific thresholds: >15 medium, >25 high, >=50 critical */
function getRiskLevelForUrl(score: number): RiskLevel {
  if (score >= 50) return 'critical';
  if (score > 25) return 'high';
  if (score > 15) return 'medium';
  return 'low';
}

export function buildAnalysisResult(params: {
  riskScore: number;
  signals?: RiskSignal[];
  reasons?: string[];
  advice?: string[];
}): AnalysisResult {
  const normalizedScore = normalizeRiskScore(params.riskScore);

  return {
    riskScore: normalizedScore,
    riskLevel: getRiskLevel(normalizedScore),
    signals: params.signals ?? [],
    reasons: params.reasons ?? [],
    advice: params.advice ?? [],
  };
}

export function buildUrlAnalysisResult(params: {
  riskScore: number;
  signals?: RiskSignal[];
  reasons?: string[];
  advice?: string[];
}): AnalysisResult {
  const normalizedScore = normalizeRiskScore(params.riskScore);
  return {
    riskScore: normalizedScore,
    riskLevel: getRiskLevelForUrl(normalizedScore),
    signals: params.signals ?? [],
    reasons: params.reasons ?? [],
    advice: params.advice ?? [],
  };
}
