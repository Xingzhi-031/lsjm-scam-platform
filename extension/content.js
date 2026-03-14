// Content script - extracts page URL, text, and selection for LSJM popup

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  try {
    if (request.action === 'getPageUrl') {
      sendResponse({ url: window.location.href });
    } else if (request.action === 'getPageText') {
      const text = document.body?.innerText?.trim() || '';
      sendResponse({ text });
    } else if (request.action === 'getSelection') {
      const text = window.getSelection()?.toString()?.trim() || '';
      sendResponse({ text });
    } else {
      sendResponse({ error: 'Unknown action' });
    }
  } catch (e) {
    sendResponse({ error: String(e.message || e) });
  }
  return true; // keep channel open for async sendResponse
});
