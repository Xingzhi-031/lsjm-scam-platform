# LLM Frontend Integration Plan

## Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Backend LLM** | ✅ Implemented | `qwenTextAnalyzer.ts` + `combineTextAnalyzer.ts` (rule 55% + semantic 45%) |
| **analyzeText route** | ❌ Not using LLM | Uses only `textAnalyzer` (rule-based) |
| **analyzeUrl route** | Rule-only | URL structure + WHOIS; no page content |
| **Frontend (web)** | ✅ Ready | Calls `POST /analyze-text`, renders `AnalysisResult` |
| **Extension** | ✅ Ready | Same API, extracts page text via `getPageText` |
| **Skill / System prompt** | Basic | Simple role; mentor suggested explicit "skill" definition |

---

## Phase 1: Wire LLM to Text Analysis (Critical Path)

**Goal:** Make the existing hybrid LLM analyzer the default for text analysis so frontend and extension get LLM-enriched results.

### 1.1 Switch `analyzeText` route to use hybrid analyzer

**File:** `backend/src/routes/analyzeText.ts`

**Change:** Replace `analyzeText` with `analyzeTextHybrid` from `combineTextAnalyzer`.

```ts
// Before
import { analyzeText } from '@/analysis/textAnalyzer';
const result = analyzeText(text);

// After
import { analyzeTextHybrid } from '@/analysis/combineTextAnalyzer';
const result = await analyzeTextHybrid(text);
```

- Ensure route handler is `async` (already returns Promise via fallback).
- Keep `useMock` and error handling unchanged.
- `AnalysisResult` shape is identical; frontend needs no change.

### 1.2 Fallback when LLM fails

If `analyzeTextWithQwen` throws (e.g. API key missing, timeout):

- Option A: Fall back to rule-only `analyzeText` and log warning.
- Option B: Return generic error with `getTextFallback`.

**Recommendation:** Option A for graceful degradation.

**File:** `backend/src/routes/analyzeText.ts`

```ts
try {
  const result = await analyzeTextHybrid(text);
  res.json(result);
} catch (err) {
  // If LLM fails, fallback to rule-based
  try {
    const fallback = await analyzeText(text);
    res.json(fallback);
  } catch {
    res.status(200).json(getTextFallback(err));
  }
}
```

### 1.3 Verification

- [ ] Start backend with `QWEN_API_KEY` (or equivalent env).
- [ ] Web: paste text → Analyze → verify signals include `llm_*` and reasons include Qwen explanation.
- [ ] Extension: "Get page text" → Analyze → same verification.
- [ ] Run without LLM key → should fallback to rule-only without 500.

---

## Phase 2: Skill Prompt Enhancement

**Goal:** Explicitly define LLM "skill" and responsibilities so it stays focused and consistent.

### 2.1 Add skill definition to system prompt

**File:** `backend/src/analysis/qwenTextAnalyzer.ts`

**Current system content:** Generic "scam and phishing text analysis engine".

**Enhancement:** Add a structured skill block:

```ts
content: `
## Skill: Scam & Phishing Text Analyst

**Role:** You are a specialized analyzer for user-facing scam detection. Your only job is to analyze message content and output structured JSON.

**Responsibilities:**
- Detect impersonation of trusted entities (banks, gov, brands)
- Identify urgency/pressure language
- Flag credential or payment requests
- Recognize reward/refund lures and official-channel bypass
- Prefer "suspicious" over "phishing" when evidence is weak
- Base analysis only on literal content; do not assume external context

**Output:** Strict JSON only. No markdown. Confidence 0–1. Signals must be short phrases from or directly supported by the message.
`.trim() + "\n\n" + (existing instructions...)
```

### 2.2 Optional: Extract skill to a constant

**File:** `backend/src/analysis/prompts.ts` (new)

```ts
export const LLM_SKILL_SYSTEM = `
## Skill: Scam & Phishing Text Analyst
...
`;
```

Then import in `qwenTextAnalyzer.ts` for maintainability.

---

## Phase 3: Full LLM Mode (100% Semantic)

**Goal:** Support "full LLM" mode where score and signals come purely from LLM (no rule blending).

### 3.1 Add `analyzeTextLLMOnly` function

**File:** `backend/src/analysis/combineTextAnalyzer.ts`

```ts
export async function analyzeTextLLMOnly(text: string): Promise<AnalysisResult> {
  const qwenResult = await analyzeTextWithQwen(text);
  const semanticScore = computeSemanticScore(qwenResult);
  const finalScore = clamp(semanticScore, 0, 100);
  const finalRiskLevel = getRiskLevelFromScore(finalScore);
  const llmSignals = semanticSignalsToRiskSignals(finalScore, qwenResult);

  return {
    riskScore: finalScore,
    riskLevel: finalRiskLevel,
    signals: llmSignals,
    reasons: [qwenResult.reason],
    advice: deriveAdviceFromSignals(llmSignals), // or reuse rule advice as fallback
  };
}
```

- Reuse `computeSemanticScore`, `getRiskLevelFromScore`, `semanticSignalsToRiskSignals`.
- Add `deriveAdviceFromSignals` or map LLM signals to advice strings.

### 3.2 Query parameter for mode selection

**File:** `backend/src/routes/analyzeText.ts`

```
POST /analyze-text?mode=hybrid   (default: rule + LLM)
POST /analyze-text?mode=llm     (100% LLM semantics)
POST /analyze-text?mode=rule    (legacy rule-only)
```

### 3.3 Frontend mode toggle (optional)

- Add a subtle "Analysis mode: Hybrid | LLM only" control.
- Or keep it as a dev/debug option via query param only.

---

## Phase 4: URL + Page Content LLM Analysis (Future)

**Goal:** When user submits a URL, optionally fetch page content and run LLM on it.

### 4.1 Dependencies

- Page extraction: extension already has `getPageText` (content script).
- Backend: would need HTTP fetch + HTML parsing (e.g. cheerio) or rely on extension to send extracted text.

### 4.2 Flow A: Extension sends URL + extracted text

1. Extension: user clicks "Analyze" in URL mode.
2. Extension: inject `getPageText` to get page content.
3. Extension: `POST /analyze-text` with `{ text: pageText }` (optionally include `url` in body for logging).
4. Backend: same as text analysis (no new route needed).

### 4.3 Flow B: Backend fetches URL

1. Backend: `POST /analyze-url` fetches HTML, extracts text (e.g. with cheerio).
2. Run `analyzeTextHybrid(extractedText)`.
3. Combine with URL-structure signals from `analyzeUrl` (domain age, etc.).

**Recommendation:** Start with Flow A (extension already has extraction) to avoid backend fetch complexity.

---

## Implementation Order

| Step | Task | Effort | Blockers |
|------|------|--------|----------|
| 1 | Wire `analyzeTextHybrid` to `/analyze-text` route | ~15 min | None |
| 2 | Add LLM failure fallback to rule-only | ~10 min | None |
| 3 | Skill prompt enhancement in `qwenTextAnalyzer` | ~20 min | None |
| 4 | Add `analyzeTextLLMOnly` + `?mode=llm` support | ~30 min | None |
| 5 | (Optional) Frontend mode selector | ~20 min | Step 4 |
| 6 | (Future) URL + page text via extension | ~1 hr | None |

---

## Environment

Ensure backend has:

```env
QWEN_API_KEY=...
QWEN_MODEL=qwen-plus  # or preferred model
```

---

## Testing Checklist

- [ ] Text analysis returns LLM signals (`llm_impersonation`, `llm_urgency`, etc.) and Qwen `reason`.
- [ ] Risk level and score align with LLM output (hybrid mode).
- [ ] `?mode=llm` returns 100% LLM-derived result.
- [ ] `?mode=rule` returns rule-only (no LLM call).
- [ ] Without API key, fallback to rule-only succeeds.
- [ ] Extension popup: "Get page text" → Analyze shows LLM-enriched result.
- [ ] Web UI: Text mode works with same behavior.

---

## Summary

| Phase | Deliverable |
|-------|-------------|
| **1** | Text analysis uses hybrid (rule + LLM); frontend/extension get LLM semantics automatically |
| **2** | Clear skill/system prompt for LLM behavior |
| **3** | Optional full-LLM mode via `?mode=llm` |
| **4** | (Future) URL analysis with page content via extension or backend fetch |

Phase 1 is the minimum to "connect LLM to frontend". Phases 2–3 improve quality and flexibility. Phase 4 extends to URL + page content.
