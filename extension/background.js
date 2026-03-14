const API_BASE = 'http://localhost:3000';

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
    return true; // async response
  }
  return false;
});
