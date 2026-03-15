# Extension Proactive Mode + Combined Text+URL Report + Risk Redirect — Implementation Plan

## 1. Goals and Scope

- **Extension**: User passive, extension active. After the user enables the extension, it listens for page navigations, automatically fetches current page URL + body text, runs combined "text + URL" analysis, and produces **one combined report**; if risk exceeds thresholds, it redirects to a **simple risk warning page**.
- **Web**: For demo and testing only; UI may differ from the extension. No auto-listen or redirect.

## 2. Extension: Listeners and Events

### 2.1 User "Enables" the Extension

- Add a **master switch** in popup or options (e.g. "Enable page risk detection").
- Persist state in `chrome.storage.local` (or `sync`) as `lsjm_auto_analyze_enabled: true/false`.
- Only when the switch is true, run the "on every navigation" logic below.

### 2.2 On Each Page Navigation

- **Listen**: Use `chrome.tabs.onUpdated` for `status === 'complete'` (or `chrome.webNavigation.onCompleted`) to get the "tab finished loading" event.
- **Data**: From the event/tab get the current **URL**; then use `chrome.tabs.sendMessage(tabId, { action: 'getPageText' })` to get **page body text** from the content script (existing `getPageText`).
- **Trigger**: Once url + text are available, send one "combined analysis" request (see backend and frontend design below).

### 2.3 Debounce and Throttle

- For the same tab, only trigger analysis once within a short window (e.g. 2–3 seconds) to avoid SPA multiple fires.
- Optional: dedupe by URL (e.g. same URL within 5 minutes not analyzed again) to avoid duplicate requests.

## 3. One Button: Text + URL Analyzed Together

### 3.1 Extension Popup

- **Single main button**: e.g. "Analyze current page" or "Check page risk".
- On click:
  1. Get current tab URL;
  2. Get page text from content script;
  3. Call backend "combined analysis" API (see below);
  4. Show **one** combined report (text score, URL score, summary, and whether redirect applies).

### 3.2 Web (demo)

- Keep separate Text / URL input areas, but **one button**: "Analyze together".
- On click: send both text and url to the combined analysis API and render the same combined report structure (shared with extension).

## 4. Backend: Combined Analysis API and Two Total Scores

### 4.1 Two Total Scores (Not Merged Into One)

- **Text score**: Reuse current logic (rule 25% + LLM 75% hybrid), yielding `textScore` (0–100), `textRiskLevel`, and text signals/reasons/advice.
- **URL score**: Reuse current URL analysis (**no LLM**), yielding `urlScore` (0–100), `urlRiskLevel`, and url signals/reasons/advice.
- **Do not** merge text and URL into a single score; return **both** scores and let the frontend display and decide redirect.

### 4.2 Combined Report Shape

```ts
// Combined analysis response
{
  text: {
    riskScore: number,      // 0-100
    riskLevel: RiskLevel,
    signals: RiskSignal[],
    reasons: string[],
    advice: string[],
  },
  url: {
    riskScore: number,
    riskLevel: RiskLevel,
    signals: RiskSignal[],
    reasons: string[],
    advice: string[],
  }
}
```

- Frontend/extension: same structure; can show "Page content risk" + "Link risk" blocks or merge signals/reasons, but **always show both scores**.

### 4.3 New API

- **POST /analyze-page** (or `/analyze-combined`)
  - Body: `{ text: string, url: string }`
  - Internally: call existing text analysis (hybrid) and URL analysis in parallel or sequence, then return the structure above.

## 5. Auto-Redirect: When and Where

### 5.1 Conditions (redirect if any is true)

- **Text**: `textScore >= 67` (current high/critical threshold; can be made configurable later, e.g. 66).
- **URL**: `urlScore > 25` (configurable).
- **Total**: `(textScore + urlScore) > 75` (i.e. sum ≥ 76 → redirect).

### 5.2 Action

- In the extension: if the combined result meets the above, call `chrome.tabs.update(tabId, { url: '...' })` to open the **risk warning page**.
- Warning page URL: extension local page, e.g. `chrome-extension://<id>/warning.html`.

### 5.3 Warning Page (minimal)

- Single screen: explain "This page/link has elevated risk" and show:
  - Text risk score + level;
  - URL risk score + level;
  - One line of advice (e.g. "Consider going back or using official channels");
  - A "Go back" button (`history.back()` or referrer passed by extension).
- No complex UI; focus on "block + explain".

## 6. Score Summary

| Dimension   | Source                    | LLM? | Use |
|------------|---------------------------|------|-----|
| Text score | Rule 25% + LLM 75%        | Yes  | Combined report + redirect if ≥67 |
| URL score  | Existing URL rules only  | No   | Combined report + redirect if >25 |

- Redirect rule: `(textScore >= 67) || (urlScore > 25) || (textScore + urlScore > 75)` → open warning page.
- **Extension popup**: does not show numeric scores; shows only risk level (Low/Medium/High/Critical) and explanation content (Signals, Reasons, Advice). Web frontend unchanged (shows full scores).

## 7. Implementation Order

1. **Branch**: `feature/extension-auto-analyze-combined-warning` (created).
2. **Backend**: Add `POST /analyze-page`, call text hybrid + URL, return `{ text, url }`.
3. **Extension**:
   - Add "Enable page risk detection" switch and persist it;
   - Listen for tab load complete (with debounce/dedupe), get url + page text, call combined API;
   - Popup: one "Analyze current page" button, same combined API, show combined report;
   - If redirect conditions met (text ≥67, url >25, or total >75), `chrome.tabs.update` to `warning.html`.
4. **Extension**: Add `warning.html` (minimal risk page) + minimal styles/script.
5. **Web (optional)**: One "Analyze together" button, same combined API and report structure for demo/testing.

## 8. Config (can move to options later)

- Text redirect threshold: default 67 (high/critical).
- URL redirect threshold: default 25.
- Total (sum of text + url) redirect threshold: > 75 (i.e. sum ≥ 76).
- Auto-redirect on/off: optional switch alongside "Enable page risk detection".
