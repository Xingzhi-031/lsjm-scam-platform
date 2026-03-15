const API_BASE = 'http://localhost:3000';
const STORAGE_KEY = 'lsjm_auto_analyze_enabled';
const TEXT_REDIRECT_THRESHOLD = 67;
const URL_REDIRECT_THRESHOLD = 25;  // redirect when url score > 25
const TOTAL_REDIRECT_THRESHOLD = 76; // sum of text + url; redirect when total > 75 (i.e. >= 76)
const DEBOUNCE_MS = 2500;
const DEDUPE_MS = 5 * 60 * 1000;

const lastAnalyzed = { tabId: null, url: null, at: 0 };

async function getAutoEnabled() {
  const o = await chrome.storage.local.get(STORAGE_KEY);
  return o[STORAGE_KEY] === true;
}

function shouldRedirect(textScore, urlScore) {
  const ts = typeof textScore === 'number' ? textScore : 0;
  const us = typeof urlScore === 'number' ? urlScore : 0;
  const total = ts + us;
  return ts >= TEXT_REDIRECT_THRESHOLD || us > URL_REDIRECT_THRESHOLD || total >= TOTAL_REDIRECT_THRESHOLD; // total > 75
}

async function runCombinedAnalysis(text, url) {
  const res = await fetch(`${API_BASE}/analyze-page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text || '', url: url || '' }),
  });
  if (!res.ok) throw new Error('Analyze failed');
  return res.json();
}

function runAutoAnalyze(tabId, url) {
  const now = Date.now();
  if (lastAnalyzed.tabId === tabId && lastAnalyzed.url === url && now - lastAnalyzed.at < DEDUPE_MS) {
    return;
  }
  lastAnalyzed.tabId = tabId;
  lastAnalyzed.url = url;
  lastAnalyzed.at = now;

  chrome.tabs.sendMessage(tabId, { action: 'getPageText' }, (pageRes) => {
    if (chrome.runtime.lastError) {
      lastAnalyzed.tabId = null;
      lastAnalyzed.url = null;
      return;
    }
    const text = (pageRes && pageRes.text) || '';
    runCombinedAnalysis(text, url)
      .then((data) => {
        const ts = data.text?.riskScore ?? 0;
        const us = data.url?.riskScore ?? 0;
        if (shouldRedirect(ts, us)) {
          const warningUrl = chrome.runtime.getURL(`warning.html?ts=${ts}&us=${us}`);
          chrome.tabs.update(tabId, { url: warningUrl });
        }
      })
      .catch(() => {
        lastAnalyzed.tabId = null;
        lastAnalyzed.url = null;
      });
  });
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab?.url) return;
  if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) return;
  const enabled = await getAutoEnabled();
  if (!enabled) return;
  setTimeout(() => runAutoAnalyze(tabId, tab.url), DEBOUNCE_MS);
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'analyzeUrl') {
    const url = request.url;
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      sendResponse({ error: 'Invalid URL' });
      return true;
    }
    fetch(`${API_BASE}/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message || 'API request failed' }));
    return true;
  }
  if (request.action === 'analyzePage') {
    const { text = '', url = '' } = request;
    runCombinedAnalysis(text, url)
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message || 'API request failed' }));
    return true;
  }
  return false;
});
