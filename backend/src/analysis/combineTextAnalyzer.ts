import type { AnalysisResult, RiskLevel, RiskSignal } from '@/types/analysisTypes';
import { analyzeText } from './textAnalyzer';
import { analyzeTextWithQwen } from './qwenTextAnalyzer';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 99) return 'critical';
  if (score >= 80) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function computeSemanticScore(result: Awaited<ReturnType<typeof analyzeTextWithQwen>>): number {
  let score = 0;

  if (result.impersonation) score += 15;
  if (result.urgency_pressure) score += 10;
  if (result.credential_request) score += 20;
  if (result.payment_request) score += 20;
  if (result.external_link_action) score += 8;
  if (result.threat_language) score += 10;
  if (result.official_channel_bypass) score += 12;
  if (result.reward_lure) score += 8;

  if (result.label === 'phishing') score += 10;
  if (result.label === 'benign') score -= 10;

  return clamp(Math.round(score * result.confidence), 0, 100);
}

function semanticSignalsToRiskSignals(
  semanticScore: number,
  result: Awaited<ReturnType<typeof analyzeTextWithQwen>>
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  const pushIf = (id: string, description: string, condition: boolean) => {
    if (condition) {
      signals.push({
        id,
        description,
        score: semanticScore,
        source: 'message',
      });
    }
  };

  pushIf('llm_impersonation', 'Qwen detected likely impersonation of a trusted entity.', result.impersonation);
  pushIf('llm_urgency', 'Qwen detected urgency or pressure language.', result.urgency_pressure);
  pushIf('llm_credential_request', 'Qwen detected a request for credentials or account verification.', result.credential_request);
  pushIf('llm_payment_request', 'Qwen detected a payment or transfer request.', result.payment_request);
  pushIf('llm_external_link', 'Qwen detected a suspicious request to click a link or take external action.', result.external_link_action);
  pushIf('llm_threat_language', 'Qwen detected threatening or fear-based language.', result.threat_language);
  pushIf('llm_official_channel_bypass', 'Qwen detected possible bypass of official channels.', result.official_channel_bypass);
  pushIf('llm_reward_lure', 'Qwen detected a reward, prize, refund, or lure pattern.', result.reward_lure);

  return signals;
}

function deriveAdviceFromLLM(riskLevel: RiskLevel, hasSignals: boolean): string[] {
  const advice: string[] = [];
  if (hasSignals) {
    advice.push('Do not click links or provide personal information until the message is verified.');
    advice.push('Verify the sender through an official channel before taking action.');
  }
  if (riskLevel === 'high' || riskLevel === 'critical') {
    advice.push('Treat this message as highly suspicious and avoid responding directly.');
  } else if (riskLevel === 'medium') {
    advice.push('Be cautious and double-check the message before acting on it.');
  } else {
    advice.push('Continue reviewing the message carefully for any suspicious content.');
  }
  return advice;
}

export async function analyzeTextLLMOnly(text: string): Promise<AnalysisResult> {
  const qwenResult = await analyzeTextWithQwen(text);
  const semanticScore = computeSemanticScore(qwenResult);
  const finalScore = clamp(semanticScore, 0, 100);
  const finalRiskLevel = getRiskLevelFromScore(finalScore);
  const llmSignals = semanticSignalsToRiskSignals(finalScore, qwenResult);
  const hasSignals = llmSignals.length > 0 || qwenResult.label !== 'benign';

  return {
    riskScore: finalScore,
    riskLevel: finalRiskLevel,
    signals: llmSignals,
    reasons: [qwenResult.reason],
    advice: deriveAdviceFromLLM(finalRiskLevel, hasSignals),
  };
}

export async function analyzeTextHybrid(text: string): Promise<AnalysisResult> {
  const ruleResult = analyzeText(text);
  const qwenResult = await analyzeTextWithQwen(text);

  const semanticScore = computeSemanticScore(qwenResult);
  const finalScore = clamp(
    Math.round(ruleResult.riskScore * 0.55 + semanticScore * 0.45),
    0,
    100
  );

  const finalRiskLevel = getRiskLevelFromScore(finalScore);

  const llmSignals = semanticSignalsToRiskSignals(semanticScore, qwenResult);

  return {
    riskScore: finalScore,
    riskLevel: finalRiskLevel,
    signals: [...ruleResult.signals, ...llmSignals],
    reasons: [...ruleResult.reasons, qwenResult.reason],
    advice: ruleResult.advice,
  };
}