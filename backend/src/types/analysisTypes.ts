export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskSignal {
  id: string;
  description: string;
  weight: number;
}

export interface AnalysisResult {
  riskScore: number;
  riskLevel: RiskLevel;
  signals: RiskSignal[];
  reasons: string[];
  advice: string[];
}

export interface AnalyzeTextRequest {
  text: string;
}

export interface AnalyzeUrlRequest {
  url: string;
}
