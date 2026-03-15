const API_BASE = window.location.origin;

const textInput = document.getElementById('text-input');
const urlInput = document.getElementById('url-input');
const analyzeTogetherBtn = document.getElementById('analyze-together-btn');
const resultPlaceholder = document.getElementById('result-placeholder');
const themeToggle = document.getElementById('theme-toggle');

const savedTheme = localStorage.getItem('lsjm-theme');

if (savedTheme === 'dark') {
  document.body.classList.add('dark');
}

themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');

  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('lsjm-theme', isDark ? 'dark' : 'light');
});
const combinedResult = document.getElementById('combined-result');

const LEVEL_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };

function getWorstLevel(levelA, levelB) {
  const a = LEVEL_ORDER[(levelA || 'low').toLowerCase()] ?? 0;
  const b = LEVEL_ORDER[(levelB || 'low').toLowerCase()] ?? 0;
  const worst = a >= b ? (levelA || 'low') : (levelB || 'low');
  return (worst || 'low').toLowerCase();
}

function setResult(content, isError = true) {
  resultPlaceholder.classList.remove('state-loading');
  resultPlaceholder.classList.toggle('state-error', isError);
  resultPlaceholder.style.display = 'block';
  if (typeof content === 'string') {
    resultPlaceholder.textContent = content;
  } else if (content && typeof content === 'object') {
    resultPlaceholder.textContent = JSON.stringify(content, null, 2);
  } else {
    resultPlaceholder.textContent = '';
  }
}

function setLoading(loading) {
  if (analyzeTogetherBtn) analyzeTogetherBtn.disabled = loading;
  if (loading) {
    resultPlaceholder.style.display = 'block';
    resultPlaceholder.textContent = 'Analyzing...';
    resultPlaceholder.classList.add('state-loading');
    resultPlaceholder.classList.remove('state-error');
    if (combinedResult) combinedResult.classList.add('hidden');
  } else {
    resultPlaceholder.classList.remove('state-loading');
  }
}

function renderTogetherHeader(textData, urlData) {
  const levelText = getWorstLevel(textData?.riskLevel, urlData?.riskLevel);
  const levelLabel = levelText.toUpperCase();
  const state = { low: 'calm', medium: 'suspicious', high: 'alert', critical: 'danger' }[levelText] || 'calm';
  const shieldySrc = '/shared/images/shieldy-' + state + '.png';
  const shadeMsg = levelText === 'low' ? "Shade moved ✓ You're in the clear." : '';
  return `
    <div class="together-header risk-${levelText}">
      <div class="together-header-content">
        <div class="result-row risk-row">
          <span class="label">Risk Level</span>
          <span class="risk-badge risk-${levelText}">${levelLabel}</span>
        </div>
        ${shadeMsg ? `<p class="shade-moved">${shadeMsg}</p>` : ''}
      </div>
      <img class="shieldy-sticker" src="${shieldySrc}" alt="Shieldy" aria-hidden="true">
    </div>
  `;
}

function renderCombinedBlock(title, data) {
  if (!data || data.riskScore == null) return '<p class="block-empty">No data</p>';
  const level = (data.riskLevel || 'low').toLowerCase();
  const signals = (data.signals || []).map(s => `<li>${(s.description || s)}${s.score != null ? ` (${s.score})` : ''}</li>`).join('') || '<li>—</li>';
  const reasons = (data.reasons || []).map(r => `<li>${r}</li>`).join('') || '<li>—</li>';
  const advice = (data.advice || []).map(a => `<li>${a}</li>`).join('') || '<li>—</li>';
  return `
    <div class="report-block risk-${level}">
      <h3 class="block-title">${title}</h3>
      <p class="block-score">Score: <strong>${data.riskScore}</strong> — ${(data.riskLevel || '').toUpperCase()}</p>
      <div class="block-section"><span class="label">Signals</span><ul>${signals}</ul></div>
      <div class="block-section"><span class="label">Reasons</span><ul>${reasons}</ul></div>
      <div class="block-section"><span class="label">Advice</span><ul>${advice}</ul></div>
    </div>
  `;
}

async function analyzeTogether() {
  const text = textInput?.value?.trim() || '';
  let url = urlInput?.value?.trim() || '';
  if (!text && !url) {
    setResult('Enter some text and/or a URL to analyze together.', true);
    return;
  }
  if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
  setLoading(true);
  if (analyzeTogetherBtn) analyzeTogetherBtn.disabled = true;
  if (combinedResult) combinedResult.classList.add('hidden');
  try {
    const res = await fetch(`${API_BASE}/analyze-page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, url }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResult(data.error || 'Request failed', true);
      return;
    }
    resultPlaceholder.style.display = 'none';
    combinedResult.classList.remove('hidden');
    combinedResult.innerHTML =
      renderTogetherHeader(data.text, data.url) +
      renderCombinedBlock('Page content (text)', data.text) +
      renderCombinedBlock('Link (URL)', data.url);
  } catch (err) {
    setResult('Error: Could not reach the analysis service. Is the backend running?', true);
    if (combinedResult) combinedResult.classList.add('hidden');
  } finally {
    setLoading(false);
    if (analyzeTogetherBtn) analyzeTogetherBtn.disabled = false;
  }
}

if (analyzeTogetherBtn) analyzeTogetherBtn.addEventListener('click', analyzeTogether);
