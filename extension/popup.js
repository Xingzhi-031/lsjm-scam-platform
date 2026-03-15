const API_BASE = 'http://localhost:3000';
const STORAGE_KEY = 'lsjm_auto_analyze_enabled';
const TEXT_REDIRECT_THRESHOLD = 67;
const URL_REDIRECT_THRESHOLD = 25;  // redirect when url score > 25
const TOTAL_REDIRECT_THRESHOLD = 76; // sum of text + url; redirect when total > 75 (i.e. >= 76)

const enableAuto = document.getElementById('enableAuto');
const analyzePageBtn = document.getElementById('analyzePageBtn');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const combinedCard = document.getElementById('combinedCard');

async function getAutoEnabled() {
  const o = await chrome.storage.local.get(STORAGE_KEY);
  return o[STORAGE_KEY] === true;
}

const textInput = document.getElementById('textInput');
const urlInput = document.getElementById('urlInput');
const textWrap = document.getElementById('textInputWrap');
const urlWrap = document.getElementById('urlInputWrap');
const modeText = document.getElementById('modeText');
const modeUrl = document.getElementById('modeUrl');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultCard = document.getElementById('resultCard');
const themeToggle = document.getElementById('themeToggle');
function setAutoEnabled(value) {
  chrome.storage.local.set({ [STORAGE_KEY]: !!value });
}

enableAuto.addEventListener('change', () => setAutoEnabled(enableAuto.checked));

const savedTheme = localStorage.getItem('lsjm-theme');

if (savedTheme === 'dark') {
  document.body.classList.add('dark');
}

themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('lsjm-theme', isDark ? 'dark' : 'light');
});

modeText?.addEventListener('click', () => { mode = 'text'; textWrap?.classList.remove('hidden'); urlWrap?.classList.add('hidden'); modeText?.classList.add('active'); modeUrl?.classList.remove('active'); });
modeUrl?.addEventListener('click', () => { mode = 'url'; urlWrap?.classList.remove('hidden'); textWrap?.classList.add('hidden'); modeUrl?.classList.add('active'); modeText?.classList.remove('active'); });
async function loadOptions() {
  enableAuto.checked = await getAutoEnabled();
}
loadOptions();

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function canInjectIntoTab(tab) {
  return tab?.url?.startsWith('http://') || tab?.url?.startsWith('https://');
}

function sendToContentScript(tabId, action) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action }, (res) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(res || {});
    });
  });
}

const LEVEL_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
function getWorstLevel(levelA, levelB) {
  const a = LEVEL_ORDER[(levelA || 'low').toLowerCase()] ?? 0;
  const b = LEVEL_ORDER[(levelB || 'low').toLowerCase()] ?? 0;
  const worst = a >= b ? (levelA || 'low') : (levelB || 'low');
  return (worst || 'low').toLowerCase();
}

function renderTogetherHeader(textData, urlData) {
  const levelText = getWorstLevel(textData?.riskLevel, urlData?.riskLevel);
  const levelLabel = levelText.toUpperCase();
  const state = { low: 'calm', medium: 'suspicious', high: 'alert', critical: 'danger' }[levelText] || 'calm';
  const shieldySrc = chrome.runtime.getURL('images/shieldy-' + state + '.png');
  const shadeMsg = levelText === 'low' ? "Shade moved ✓ You're in the clear." : '';
  return `
    <div class="togetherHeader risk-${levelText}">
      <div class="togetherHeaderContent">
        <span class="risk-badge risk-${levelText}">${levelLabel}</span>
        ${shadeMsg ? `<p class="shadeMoved">${shadeMsg}</p>` : ''}
      </div>
      <img class="shieldySticker" src="${shieldySrc}" alt="Shieldy" aria-hidden="true">
    </div>
  `;
}

// Extension: show only risk level (low/medium/high/critical) and explanation content; no numeric scores
function renderBlock(title, data) {
  if (!data || data.riskLevel == null) return '<p class="blockEmpty">No data</p>';
  const level = (data.riskLevel || 'low').toLowerCase();
  const levelLabel = (data.riskLevel || 'low').toUpperCase();
  const signals = (data.signals || []).map(s => `<li>${s.description || s}</li>`).join('') || '<li>—</li>';
  const reasons = (data.reasons || []).map(r => `<li>${r}</li>`).join('') || '<li>—</li>';
  const advice = (data.advice || []).map(a => `<li>${a}</li>`).join('') || '<li>—</li>';
  return `
    <div class="reportBlock risk-${level}">
      <h4>${title}</h4>
      <p class="blockLevel">Risk level: <strong>${levelLabel}</strong></p>
      <div class="blockSection"><strong>Signals</strong><ul>${signals}</ul></div>
      <div class="blockSection"><strong>Reasons</strong><ul>${reasons}</ul></div>
      <div class="blockSection"><strong>Advice</strong><ul>${advice}</ul></div>
    </div>
  `;
}

function setError(msg) {
  resultPlaceholder.textContent = msg;
  resultPlaceholder.className = 'resultPlaceholder error';
  resultPlaceholder.classList.remove('hidden');
  combinedCard.classList.add('hidden');
}

function setLoading(loading) {
  analyzePageBtn.disabled = loading;
  if (loading) {
    resultPlaceholder.textContent = 'Analyzing page...';
    resultPlaceholder.className = 'resultPlaceholder state-loading';
    resultPlaceholder.classList.remove('hidden');
    combinedCard.classList.add('hidden');
  }
}

function shouldRedirect(textScore, urlScore) {
  const ts = typeof textScore === 'number' ? textScore : 0;
  const us = typeof urlScore === 'number' ? urlScore : 0;
  const total = ts + us;
  return ts >= TEXT_REDIRECT_THRESHOLD || us > URL_REDIRECT_THRESHOLD || total >= TOTAL_REDIRECT_THRESHOLD;
}

analyzePageBtn.addEventListener('click', async () => {
  setLoading(true);
  try {
    const tab = await getCurrentTab();
    if (!tab?.id) {
      setError('No active tab.');
      return;
    }
    let url = tab.url || '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Current page is not a web URL (e.g. chrome://).');
      return;
    }
    let text = '';
    try {
      const res = await sendToContentScript(tab.id, 'getPageText');
      text = res.text || '';
    } catch (_e) {
      text = '';
    }
    const res = await fetch(`${API_BASE}/analyze-page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, url }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Request failed.');
      return;
    }
    resultPlaceholder.classList.add('hidden');
    combinedCard.classList.remove('hidden');
    const headerHtml = renderTogetherHeader(data.text, data.url);
    const textHtml = renderBlock('Page content (text)', data.text);
    const urlHtml = renderBlock('Link (URL)', data.url);
    const textScore = data.text?.riskScore ?? 0;
    const urlScore = data.url?.riskScore ?? 0;
    let warnHtml = '';
    if (shouldRedirect(textScore, urlScore)) {
      const warningUrl = chrome.runtime.getURL(`warning.html?ts=${textScore}&us=${urlScore}`);
      warnHtml = `<p class="riskWarn">High risk detected. <a href="${warningUrl}" target="_blank" id="openWarning">Open warning page</a></p>`;
    }
    combinedCard.innerHTML = warnHtml + headerHtml + textHtml + urlHtml;
  } catch (err) {
    setError(err.message || 'Backend not reachable. Start server on port 3000.');
  } finally {
    setLoading(false);
  }
});
