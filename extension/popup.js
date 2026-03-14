const API_BASE = 'http://localhost:3000';

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

function sendToContentScript(action) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.[0]?.id) {
        reject(new Error('No active tab'));
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action }, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Cannot access this page'));
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
  } catch (err) {
    setError('Backend not reachable. Start server on port 3000.');
  } finally {
    analyzeBtn.disabled = false;
  }
});
