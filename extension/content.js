// Content script - extracts page URL, text, selection; injects floating warning

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  try {
    if (request.action === 'getPageUrl') {
      sendResponse({ url: window.location.href });
    } else if (request.action === 'getPageText') {
      let text = document.body?.innerText?.trim() || '';
      const maxLen = 50000;
      const truncated = text.length > maxLen;
      if (truncated) text = text.slice(0, maxLen);
      sendResponse({ text, truncated });
    } else if (request.action === 'getSelection') {
      const text = window.getSelection()?.toString()?.trim() || '';
      sendResponse({ text });
    } else if (request.action === 'showFloatingWarning' && request.data) {
      injectFloatingWarning(request.data);
      sendResponse({ ok: true });
    } else {
      sendResponse({ error: 'Unknown action' });
    }
  } catch (e) {
    sendResponse({ error: String(e.message || e) });
  }
  return true;
});

// Auto-analyze on page load and show floating warning if risky
const url = window.location.href;
if (url.startsWith('http://') || url.startsWith('https://')) {
  chrome.runtime.sendMessage({ action: 'analyzeUrl', url }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.error) return;
    const level = (response?.riskLevel || '').toLowerCase();
    if (level === 'medium' || level === 'high' || level === 'critical') {
      injectFloatingWarning(response);
    }
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function injectFloatingWarning(data) {
  if (document.getElementById('lsjm-floating-warning')) return;

  const panel = document.createElement('div');
  panel.id = 'lsjm-floating-warning';
  panel.innerHTML = `
    <div class="lsjm-panel">
      <button class="lsjm-close" aria-label="Close">×</button>
      <div class="lsjm-icon">⚠</div>
      <div class="lsjm-title">Potential Scam Detected</div>
      <div class="lsjm-level">Risk Level: ${(data.riskLevel || 'unknown').toUpperCase()}</div>
      <div class="lsjm-advice">${escapeHtml((data.advice && data.advice[0]) || 'Avoid entering personal information on this page.')}</div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #lsjm-floating-warning {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      max-width: 280px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-radius: 8px;
      overflow: hidden;
    }
    #lsjm-floating-warning .lsjm-panel {
      background: #fff3e0;
      border: 1px solid #e65100;
      padding: 12px 36px 12px 12px;
      position: relative;
    }
    #lsjm-floating-warning .lsjm-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      line-height: 1;
      padding: 0 4px;
    }
    #lsjm-floating-warning .lsjm-close:hover {
      color: #000;
    }
    #lsjm-floating-warning .lsjm-icon {
      font-size: 18px;
      margin-bottom: 4px;
    }
    #lsjm-floating-warning .lsjm-title {
      font-weight: 600;
      color: #bf360c;
      margin-bottom: 4px;
    }
    #lsjm-floating-warning .lsjm-level {
      font-weight: 600;
      color: #e65100;
      margin-bottom: 6px;
    }
    #lsjm-floating-warning .lsjm-advice {
      color: #5d4037;
      font-size: 12px;
      line-height: 1.4;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(panel);

  panel.querySelector('.lsjm-close').addEventListener('click', () => {
    panel.remove();
  });
}
