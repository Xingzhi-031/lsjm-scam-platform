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

function setResult(content) {
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
    const card = document.getElementById('result-card');
    if (card) card.classList.add('hidden');
  }
}

function renderResultCard(result) {

  const card = document.getElementById("result-card");
  const placeholder = document.getElementById("result-placeholder");

  if (!card) {
    setResult(result);
    return;
  }

  resultPlaceholder.style.display = "none";
  card.classList.remove("hidden");

  document.getElementById("riskScore").textContent = result.riskScore;

  const riskLevel = document.getElementById("riskLevel");
  riskLevel.textContent = result.riskLevel.toUpperCase();
  riskLevel.className = "risk-badge risk-" + result.riskLevel;

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
      if (!text) { setResult('Please enter some text.'); setLoading(false); return; }
      const res = await fetch(`${API_BASE}/analyze-text`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const data = await res.json();
      renderResultCard(data);
    } else {
      let url = urlInput?.value?.trim();
      if (!url) { setResult('Please enter a URL.'); setLoading(false); return; }
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const res = await fetch(`${API_BASE}/analyze-url`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json();
      renderResultCard(data);
    }
  } catch (err) {
    setResult('Error: Could not reach the analysis service. Is the backend running?');
  } finally {
    setLoading(false);
  }
}

analyzeBtn.addEventListener('click', analyze);
