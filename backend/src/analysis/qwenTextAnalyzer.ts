import { qwenClient } from './qwenClient';

export interface QwenSemanticResult {
  label: 'phishing' | 'suspicious' | 'benign';
  confidence: number;
  impersonation: boolean;
  urgency_pressure: boolean;
  credential_request: boolean;
  payment_request: boolean;
  external_link_action: boolean;
  threat_language: boolean;
  official_channel_bypass: boolean;
  reward_lure: boolean;
  scam_type: string;
  reason: string;
}

export async function analyzeTextWithQwen(text: string): Promise<QwenSemanticResult> {
  const completion = await qwenClient.chat.completions.create({
    model: process.env.QWEN_MODEL || 'qwen-plus',
    messages: [
      {
        role: 'system',
        content: `
You are a scam and phishing text analysis engine.

Analyze the message only based on its content.
Do not assume facts not present in the text.
Return strict JSON only.
        `.trim(),
      },
      {
        role: 'user',
        content: `
Analyze this message:

"""
${text}
"""

Return JSON in this exact shape:
{
  "label": "phishing" | "suspicious" | "benign",
  "confidence": 0.0,
  "impersonation": true,
  "urgency_pressure": false,
  "credential_request": false,
  "payment_request": false,
  "external_link_action": false,
  "threat_language": false,
  "official_channel_bypass": false,
  "reward_lure": false,
  "scam_type": "string",
  "reason": "short explanation"
}
        `.trim(),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content);
    return {
      label: parsed.label ?? 'suspicious',
      confidence: Number(parsed.confidence ?? 0.5),
      impersonation: Boolean(parsed.impersonation),
      urgency_pressure: Boolean(parsed.urgency_pressure),
      credential_request: Boolean(parsed.credential_request),
      payment_request: Boolean(parsed.payment_request),
      external_link_action: Boolean(parsed.external_link_action),
      threat_language: Boolean(parsed.threat_language),
      official_channel_bypass: Boolean(parsed.official_channel_bypass),
      reward_lure: Boolean(parsed.reward_lure),
      scam_type: String(parsed.scam_type ?? 'unknown'),
      reason: String(parsed.reason ?? 'No explanation provided.'),
    };
  } catch {
    return {
      label: 'suspicious',
      confidence: 0.5,
      impersonation: false,
      urgency_pressure: false,
      credential_request: false,
      payment_request: false,
      external_link_action: false,
      threat_language: false,
      official_channel_bypass: false,
      reward_lure: false,
      scam_type: 'unknown',
      reason: 'Failed to parse model output.',
    };
  }
}