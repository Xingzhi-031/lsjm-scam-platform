# Frontend Output Structure Design (Based on LLM Framework)

## Current Mapping

### LLM Raw Output (QwenSemanticResult)

| Field | Type | Description |
|-------|------|-------------|
| `label` | phishing \| suspicious \| benign | Semantic classification |
| `confidence` | 0–1 | Confidence score |
| `impersonation` | boolean | Impersonation of trusted entity |
| `urgency_pressure` | boolean | Urgency or pressure tactics |
| `credential_request` | boolean | Request for credentials |
| `payment_request` | boolean | Request for payment |
| `external_link_action` | boolean | Suspicious link or external action |
| `threat_language` | boolean | Threatening language |
| `official_channel_bypass` | boolean | Bypass of official channels |
| `reward_lure` | boolean | Reward, refund or lure pattern |
| `scam_type` | string | Scam type label |
| `signals` | string[] | Short phrases extracted by LLM |
| `reason` | string | Explanation |

### Current API (AnalysisResult)

| Field | Source |
|-------|--------|
| riskScore | Rule + LLM computation |
| riskLevel | low/medium/high/critical |
| signals | RiskSignal[] (includes llm_* descriptions) |
| reasons | string[] (includes qwenResult.reason) |
| advice | string[] |

### Current Frontend Display

- **Risk Score** + **Risk Level** + Shieldy
- **Signals**: Flat list
- **Reasons**: Flat list
- **Advice**: Flat list

### Information Not Passed to Frontend

| LLM Field | Passed to Frontend? |
|-----------|---------------------|
| label | ❌ Only mapped to riskLevel |
| confidence | ❌ Not displayed |
| 8 indicator booleans | ❌ Flattened into signals, no structure |
| scam_type | ❌ Not passed |
| signals (LLM phrases) | ❌ Not shown separately |

---

## Design Goals

Redesign the frontend output structure around the LLM semantic framework so users clearly see:

1. LLM overall judgment (label + confidence)
2. Detected risk dimensions (8 indicator categories)
3. Scam type (scam_type)
4. LLM evidence items (signals)
5. Comprehensive explanation (reason)

---

## Option A: Extend API, Frontend Renders by LLM Structure

### 1. Extend AnalysisResult

```ts
// types/analysisTypes.ts
export interface LLMDetails {
  label: 'phishing' | 'suspicious' | 'benign';
  confidence: number;
  indicators: {
    impersonation?: boolean;
    urgency_pressure?: boolean;
    credential_request?: boolean;
    payment_request?: boolean;
    external_link_action?: boolean;
    threat_language?: boolean;
    official_channel_bypass?: boolean;
    reward_lure?: boolean;
  };
  scamType: string;
  rawSignals: string[];   // LLM raw phrases
  reason: string;
}

export interface AnalysisResult {
  riskScore: number;
  riskLevel: RiskLevel;
  signals: RiskSignal[];
  reasons: string[];
  advice: string[];
  llmDetails?: LLMDetails;   // Present when LLM is used
}
```

### 2. Backend Fills llmDetails in hybrid/llm Modes

- `combineTextAnalyzer` attaches `llmDetails` to the response
- Rule-only mode does not set `llmDetails`

### 3. Frontend Renders by LLM Structure

**When `result.llmDetails` exists:**

```
┌─ Risk Header ─────────────────────────────────┐
│ Risk Score  83    Risk Level  HIGH   [Shieldy] │
│ LLM: phishing (confidence: 0.85)               │
└───────────────────────────────────────────────┘

Detected indicators
├─ Impersonation
├─ Urgency / pressure
└─ Credential request

Scam type
└─ Phishing / credential theft

LLM explanation
└─ The message contains urgency language and requests...

Evidence (raw signals)
├─ "verify your account immediately"
└─ "click the link below"

Advice
├─ Do not click links...
└─ Verify through official channels...
```

**When rule-only analysis:**

Keep the existing Signals / Reasons / Advice three-block layout.

---

## Option B: Minimal Change, Grouping and Supplemental Display Only

Do not extend the API; only improve frontend display:

1. **Group signals**: `llm_*` under "LLM detected", others under "Rule detected"
2. **Group reasons**: If multiple, treat the first one containing "Qwen detected" etc. as "LLM explanation"
3. **Add scamType**: Backend includes it in `reasons` or a signal; frontend parses and displays

Pros: Small change. Cons: scam_type, confidence, label still cannot be shown directly.

---

## Recommendation: Option A

| Step | Task |
|------|------|
| 1 | Extend `AnalysisResult` with `llmDetails?` |
| 2 | `combineTextAnalyzer` constructs and fills `llmDetails` in hybrid/llm modes |
| 3 | Frontend: when `llmDetails` exists, render by "Detected indicators / Scam type / LLM explanation / Evidence / Advice" structure |
| 4 | Frontend: rule-only mode keeps current three-block structure |
| 5 | Extension popup mirrors the same structure |

---

## Suggested Frontend Component Structure

```html
<!-- When llmDetails exists -->
<div class="llm-analysis">
  <div class="llm-summary">LLM: {{label}} ({{confidence}}%)</div>
  <div class="indicators">
    <h4>Detected indicators</h4>
    <ul><!-- Only show the 8 categories that are true --></ul>
  </div>
  <div class="scam-type" v-if="scamType"><h4>Scam type</h4><p>{{scamType}}</p></div>
  <div class="llm-explanation"><h4>Explanation</h4><p>{{reason}}</p></div>
  <div class="raw-signals" v-if="rawSignals.length"><h4>Evidence</h4><ul>...</ul></div>
</div>
<div class="advice">...</div>
```

---

## Display Copy for 8 Indicator Categories

| id | Frontend display copy |
|----|-----------------------|
| llm_impersonation | Impersonation of trusted entity |
| llm_urgency | Urgency or pressure language |
| llm_credential_request | Request for credentials or verification |
| llm_payment_request | Payment or transfer request |
| llm_external_link | Suspicious link or external action |
| llm_threat_language | Threatening or fear-based language |
| llm_official_channel_bypass | Bypass of official channels |
| llm_reward_lure | Reward, prize, refund or lure pattern |
