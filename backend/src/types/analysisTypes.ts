export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type SignalSource = 'url' | 'message';

export interface RiskSignal {
  id: string;
  description: string;
  score: number;
  source: SignalSource;
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
