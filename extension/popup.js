const API_BASE = 'http://localhost:3000';

// Injected into page via executeScript - must be a function (serializable)
function injectFloatingPanel(data) {
  if (document.getElementById('lsjm-floating-warning')) return;
  const advice = (data.advice && data.advice[0]) || 'Avoid entering personal information on this page.';
  const level = (data.riskLevel || 'unknown').toUpperCase();
  const div = document.createElement('div');
  div.id = 'lsjm-floating-warning';
  div.innerHTML = '<div class="lsjm-panel"><button class="lsjm-close" aria-label="Close">×</button><div class="lsjm-icon">⚠</div><div class="lsjm-title">Potential Scam Detected</div><div class="lsjm-level">Risk Level: ' + level + '</div><div class="lsjm-advice">' + advice.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div></div>';
  const style = document.createElement('style');
  style.textContent = '#lsjm-floating-warning{position:fixed;bottom:16px;right:16px;z-index:2147483647;font-family:system-ui,sans-serif;font-size:13px;max-width:280px;box-shadow:0 4px 12px rgba(0,0,0,.15);border-radius:8px;overflow:hidden}#lsjm-floating-warning .lsjm-panel{background:#fff3e0;border:1px solid #e65100;padding:12px 36px 12px 12px;position:relative}#lsjm-floating-warning .lsjm-close{position:absolute;top:8px;right:8px;background:none;border:none;font-size:20px;cursor:pointer;color:#666;line-height:1;padding:0 4px}#lsjm-floating-warning .lsjm-close:hover{color:#000}#lsjm-floating-warning .lsjm-icon{font-size:18px;margin-bottom:4px}#lsjm-floating-warning .lsjm-title{font-weight:600;color:#bf360c;margin-bottom:4px}#lsjm-floating-warning .lsjm-level{font-weight:600;color:#e65100;margin-bottom:6px}#lsjm-floating-warning .lsjm-advice{color:#5d4037;font-size:12px;line-height:1.4}';
  document.head.appendChild(style);
  document.body.appendChild(div);
  div.querySelector('.lsjm-close').onclick = () => div.remove();
}

const textInput = document.getElementById('textInput');
const urlInput = document.getElementById('urlInput');
const textWrap = document.getElementById('textInputWrap');
const urlWrap = document.getElementById('urlInputWrap');
const modeText = document.getElementById('modeText');
const modeUrl = document.getElementById('modeUrl');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const resultCard = document.getElementById('resultCard');

let mode = 'text';

modeText?.addEventListener('click', () => { mode = 'text'; textWrap?.classList.remove('hidden'); urlWrap?.classList.add('hidden'); modeText?.classList.add('active'); modeUrl?.classList.remove('active'); });
modeUrl?.addEventListener('click', () => { mode = 'url'; urlWrap?.classList.remove('hidden'); textWrap?.classList.add('hidden'); modeUrl?.classList.add('active'); modeText?.classList.remove('active'); });

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function canInjectIntoTab(tab) {
  return tab?.url?.startsWith('http://') || tab?.url?.startsWith('https://');
}

function sendToContentScript(action) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab?.id) {
        reject(new Error('No active tab'));
        return;
      }
      if (!canInjectIntoTab(tab)) {
        reject(new Error('Cannot access this page (try a regular website)'));
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action }, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Cannot access this page. Try refreshing the tab.'));
          return;
        }
        resolve(res || {});
      });
    });
  });
}

document.getElementById('btnCurrentUrl')?.addEventListener('click', async () => {
  try {
    const tab = await getCurrentTab();
    if (!tab?.url) {
      setError('No active tab found.');
      return;
    }
    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
      urlInput.value = tab.url;
    } else {
      setError('Cannot get URL from this page (e.g. chrome://, new tab).');
    }
  } catch (e) {
    setError(e.message || 'Failed to get current page URL.');
  }
});

document.getElementById('btnPageText')?.addEventListener('click', async () => {
  try {
    const res = await sendToContentScript('getPageText');
    textInput.value = res.text || '';
  } catch (e) {
    setError(e.message || 'Failed to get page text.');
  }
});

document.getElementById('btnSelection')?.addEventListener('click', async () => {
  try {
    const res = await sendToContentScript('getSelection');
    textInput.value = res.text || '';
  } catch (e) {
    setError(e.message || 'Failed to get selection.');
  }
});

function renderResultCard(data) {
  resultPlaceholder.classList.add('hidden');
  resultPlaceholder.classList.remove('error');
  const signalsHtml = (data.signals || []).length
    ? (data.signals || []).map(s => `<li>${s.score != null ? `${s.description} (${s.score})` : s.description}</li>`).join('')
    : '<li>—</li>';
  const reasonsList = (data.reasons || []).length ? data.reasons.map(r => `<li>${r}</li>`).join('') : '<li>—</li>';
  const adviceList = (data.advice || []).length ? data.advice.map(a => `<li>${a}</li>`).join('') : '<li>—</li>';
  resultCard.innerHTML = `
    <div class="riskHeader"><span class="riskScore">${data.riskScore ?? 0}</span> <span class="riskLevel ${data.riskLevel || 'low'}">${data.riskLevel || 'low'}</span></div>
    <div class="resultField"><strong>Signals</strong><ul>${signalsHtml}</ul></div>
    <div class="resultField"><strong>Reasons</strong><ul>${reasonsList}</ul></div>
    <div class="resultField"><strong>Advice</strong><ul>${adviceList}</ul></div>
  `;
  resultCard.classList.remove('hidden');
}

function setError(msg) {
  resultPlaceholder.textContent = msg;
  resultPlaceholder.className = 'resultPlaceholder error';
  resultPlaceholder.classList.remove('hidden');
  resultCard.classList.add('hidden');
}

analyzeBtn.addEventListener('click', async () => {
  resultPlaceholder.textContent = 'Analyzing...';
  resultPlaceholder.className = 'resultPlaceholder';
  resultPlaceholder.classList.remove('hidden');
  resultCard.classList.add('hidden');
  analyzeBtn.disabled = true;

  try {
    let res;
    if (mode === 'text') {
      const text = textInput?.value?.trim();
      if (!text) { setError('Please enter text.'); analyzeBtn.disabled = false; return; }
      res = await fetch(`${API_BASE}/analyze-text`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    } else {
      let url = urlInput?.value?.trim();
      if (!url) { setError('Please enter URL.'); analyzeBtn.disabled = false; return; }
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      res = await fetch(`${API_BASE}/analyze-url`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    }
    const data = await res.json();
    renderResultCard(data);
    const level = (data.riskLevel || '').toLowerCase();
    if (level === 'medium' || level === 'high' || level === 'critical') {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && canInjectIntoTab(tab)) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: injectFloatingPanel,
            args: [data],
          });
        }
      } catch (_e) { /* panel injection failed - e.g. restricted page */ }
    }
  } catch (err) {
    setError('Backend not reachable. Start server on port 3000.');
  } finally {
    analyzeBtn.disabled = false;
  }
});
