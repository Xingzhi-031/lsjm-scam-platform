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
  signals: string[];
  reason: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeLabel(value: unknown): 'phishing' | 'suspicious' | 'benign' {
  if (value === 'phishing' || value === 'suspicious' || value === 'benign') {
    return value;
  }
  return 'suspicious';
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fencedJsonMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedJsonMatch?.[1]) {
    return fencedJsonMatch[1].trim();
  }

  const fencedMatch = trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const insideFence = fencedMatch[1].trim();
    const firstBrace = insideFence.indexOf('{');
    const lastBrace = insideFence.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return insideFence.slice(firstBrace, lastBrace + 1);
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return '{}';
}

function buildFallbackResult(reason: string): QwenSemanticResult {
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
    signals: [],
    reason,
  };
}

export async function analyzeTextWithQwen(text: string): Promise<QwenSemanticResult> {
  const completion = await qwenClient.chat.completions.create({
    model: process.env.QWEN_MODEL || 'qwen-plus',
    messages: [
      {
        role: 'system',
        content: `
## Skill: Scam & Phishing Text Analyst

**Role:** You are a specialized analyzer for user-facing scam detection. Your only job is to analyze message content and output structured JSON.

**Responsibilities:**
- Detect impersonation of trusted entities (banks, gov, brands)
- Identify urgency or pressure language
- Flag credential or payment requests
- Recognize reward/refund lures and official-channel bypass
- Prefer "suspicious" over "phishing" when evidence is weak
- Base analysis only on literal content; do not assume external context

**Output rules:**
- Return strict JSON only. No markdown. No text outside JSON.
- Confidence must be a number between 0 and 1.
- Signals must be short phrases taken directly from or directly supported by the message.
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
  "signals": ["string", "string"],
  "reason": "short explanation"
}
        `.trim(),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? '{}';

  try {
    const jsonText = extractJsonObject(content);
    const parsed = JSON.parse(jsonText);

    return {
      label: normalizeLabel(parsed.label),
      confidence: clamp(Number(parsed.confidence ?? 0.5), 0, 1),
      impersonation: toBoolean(parsed.impersonation),
      urgency_pressure: toBoolean(parsed.urgency_pressure),
      credential_request: toBoolean(parsed.credential_request),
      payment_request: toBoolean(parsed.payment_request),
      external_link_action: toBoolean(parsed.external_link_action),
      threat_language: toBoolean(parsed.threat_language),
      official_channel_bypass: toBoolean(parsed.official_channel_bypass),
      reward_lure: toBoolean(parsed.reward_lure),
      scam_type: String(parsed.scam_type ?? 'unknown'),
      signals: toStringArray(parsed.signals),
      reason: String(parsed.reason ?? 'No explanation provided.'),
    };
  } catch {
    return buildFallbackResult('Failed to parse model output.');
  }
}