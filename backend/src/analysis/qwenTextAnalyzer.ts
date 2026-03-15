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
  if (!qwenClient) {
    throw new Error('LLM not configured (missing DASHSCOPE_API_KEY or DASHSCOPE_BASE_URL)');
  }
  const completion = await qwenClient.chat.completions.create({
    model: process.env.QWEN_MODEL || 'qwen-plus',
    messages: [
      {
        role: 'system',
        content: `
## Skill: Scam & Phishing Text Analyst

**Role:** You are a specialized analyzer for user-facing scam detection. Your only job is to analyze a single message and output structured JSON.

**Responsibilities:**
- Detect impersonation of trusted entities, especially:
  - banks and financial institutions
  - myGov, ATO, and other government agencies
  - Australia Post, toll operators, and delivery services
  - major consumer brands, loyalty programs, and refund-related brands such as Qantas
  - family or personal-contact impersonation such as "Hi Mum" scams
- Identify urgency, fear, pressure, or forced-action language
- Flag requests for credentials, OTP codes, identity verification, payment, bank/card details, or wallet transfers
- Recognize reward, refund, loyalty-points, parcel, unpaid toll, account issue, and verification lures
- Recognize official-channel bypass, such as asking the user to reply privately, move to another app, avoid calling official support, or act outside normal processes
- Recognize common scam narratives, including:
  - bank impersonation
  - myGov / ATO / government impersonation
  - AusPost / toll / delivery redirection scams
  - Qantas / points / refund lures
  - "Hi Mum" family impersonation
  - romance scams
  - investment / crypto recruitment or deposit scams
- Prefer "suspicious" over "phishing" when evidence is weak or incomplete
- Base analysis only on literal content; do not assume hidden sender identity, malicious links, fake websites, or external context unless explicitly stated in the message

**Label definitions:**
- "phishing": strong evidence of deceptive intent to obtain credentials, OTPs, identity details, money, payment details, or immediate risky action through impersonation, coercion, or manipulation
- "suspicious": some scam indicators are present, but the evidence is incomplete, indirect, or not strong enough for a phishing label
- "benign": ordinary informational, conversational, or promotional content without meaningful scam indicators

**Decision rules:**
- Do not classify a message as phishing only because it mentions a known bank, government body, brand, delivery service, or family role
- Impersonation plus urgency, credential request, payment request, verification request, or forced action is strong evidence of phishing
- Requests for passwords, OTP codes, login verification, bank details, card details, transfers, crypto deposits, or urgent payment are strong phishing indicators
- Reward, refund, points, parcel, toll, and account-problem lures should increase risk when paired with pressure or action requests
- Romance, investment, and crypto messages should be treated as higher risk when they push fast trust, secrecy, off-platform contact, or money transfer
- "Hi Mum" or family-emergency narratives should be treated as higher risk when the sender claims urgent need, new numbers, payment trouble, or asks for transfer/help immediately
- Urgency alone is not enough for phishing; if evidence is weak, classify as "suspicious"

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