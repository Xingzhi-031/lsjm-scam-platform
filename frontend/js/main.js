const API_BASE = window.location.origin;

const textInput = document.getElementById('text-input');
const urlInput = document.getElementById('url-input');
const textWrap = document.getElementById('text-input-wrap');
const urlWrap = document.getElementById('url-input-wrap');
const modeText = document.getElementById('mode-text');
const modeUrl = document.getElementById('mode-url');
const analyzeBtn = document.getElementById('analyze-btn');
const analyzeTogetherBtn = document.getElementById('analyze-together-btn');
const resultPlaceholder = document.getElementById('result-placeholder');
const combinedResult = document.getElementById('combined-result');
const resultCard = document.getElementById('result-card");

let mode = 'text';

modeText?.addEventListener('click', () => { mode = 'text'; textWrap?.classList.remove('hidden'); urlWrap?.classList.add('hidden'); modeText.classList.add('active'); modeUrl?.classList.remove('active'); });
modeUrl?.addEventListener('click', () => { mode = 'url'; urlWrap?.classList.remove('hidden'); textWrap?.classList.add('hidden'); modeUrl?.classList.add('active'); modeText?.classList.remove('active'); });

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
  analyzeBtn.disabled = loading;
  if (loading) {
    resultPlaceholder.style.display = 'block';
    resultPlaceholder.textContent = 'Analyzing...';
    resultPlaceholder.classList.add('state-loading');
    resultPlaceholder.classList.remove('state-error');
    const card = document.getElementById('result-card');
    if (card) card.classList.add('hidden');
    if (combinedResult) combinedResult.classList.add('hidden');
  } else {
    resultPlaceholder.classList.remove('state-loading');
  }
}

function renderResultCard(result) {
  const card = document.getElementById("result-card");
  if (!card) {
    setResult(result);
    return;
  }
  if (combinedResult) combinedResult.classList.add('hidden');
  const level = (result.riskLevel || "low").toLowerCase();
  resultPlaceholder.style.display = "none";
  resultPlaceholder.classList.remove("state-loading", "state-error");
  card.classList.remove("hidden", "risk-low", "risk-medium", "risk-high", "risk-critical");
  card.classList.add("risk-" + level, "animate-in");

  document.getElementById("riskScore").textContent = result.riskScore;

  const riskLevelEl = document.getElementById("riskLevel");
  riskLevelEl.textContent = (result.riskLevel || "LOW").toUpperCase();
  riskLevelEl.className = "risk-badge risk-" + level;

  const shadeMsg = document.getElementById("shade-moved-msg");
  if (shadeMsg) {
    if (level === "low") {
      shadeMsg.textContent = "Shade moved ✓ You're in the clear.";
      shadeMsg.classList.remove("hidden");
    } else {
      shadeMsg.classList.add("hidden");
    }
  }

  const shieldy = document.getElementById("shieldy-sticker");
  if (shieldy) {
    const state = { low: "calm", medium: "suspicious", high: "alert", critical: "danger" }[level] || "calm";
    shieldy.src = "/shared/images/shieldy-" + state + ".png";
    shieldy.className = "shieldy-sticker";
    shieldy.classList.remove("hidden");
  }

  renderList("signalsList", (result.signals || []).map(s => s.score != null ? `${s.description} (score: ${s.score})` : s.description));
  renderList("reasonsList", result.reasons || []);
  renderList("adviceList", result.advice || []);
}

function renderList(id, items) {
  const list = document.getElementById(id);
  if (!list) return;
  list.innerHTML = "";
  (items || []).forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

async function analyze() {
  setLoading(true);
  try {
    if (mode === 'text') {
      const text = textInput?.value?.trim();
      if (!text) { setResult('Please enter some text.', true); setLoading(false); return; }
      const analysisMode = document.getElementById('analysis-mode')?.value || 'hybrid';
      const res = await fetch(`${API_BASE}/analyze-text?mode=${analysisMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const data = await res.json();
      renderResultCard(data);
    } else {
      let url = urlInput?.value?.trim();
      if (!url) { setResult('Please enter a URL.', true); setLoading(false); return; }
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const res = await fetch(`${API_BASE}/analyze-url`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json();
      renderResultCard(data);
    }
  } catch (err) {
    setResult('Error: Could not reach the analysis service. Is the backend running?', true);
  } finally {
    setLoading(false);
  }
}

function renderCombinedBlock(title, data) {
  if (!data || data.riskScore == null) return '<p class="block-empty">No data</p>';
  const level = (data.riskLevel || 'low').toLowerCase();
  const signals = (data.signals || []).map(s => `<li>${s.description}${s.score != null ? ` (${s.score})` : ''}</li>`).join('') || '<li>—</li>';
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
  combinedResult.classList.add('hidden');
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
    if (resultCard) resultCard.classList.add('hidden');
    combinedResult.classList.remove('hidden');
    combinedResult.innerHTML =
      renderCombinedBlock('Page content (text)', data.text) +
      renderCombinedBlock('Link (URL)', data.url);
  } catch (err) {
    setResult('Error: Could not reach the analysis service. Is the backend running?', true);
    combinedResult.classList.add('hidden');
  } finally {
    setLoading(false);
    if (analyzeTogetherBtn) analyzeTogetherBtn.disabled = false;
  }
}

analyzeBtn.addEventListener('click', analyze);
analyzeTogetherBtn?.addEventListener('click', analyzeTogether);
