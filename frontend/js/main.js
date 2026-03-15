const API_BASE = window.location.origin;

const textInput = document.getElementById('text-input');
const urlInput = document.getElementById('url-input');
const textWrap = document.getElementById('text-input-wrap');
const urlWrap = document.getElementById('url-input-wrap');
const modeText = document.getElementById('mode-text');
const modeUrl = document.getElementById('mode-url');
const analyzeBtn = document.getElementById('analyze-btn');
const resultPlaceholder = document.getElementById('result-placeholder');

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

analyzeBtn.addEventListener('click', analyze);
