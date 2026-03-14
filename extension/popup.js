const API_BASE = 'http://localhost:3000';

const textInput = document.getElementById('textInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const resultCard = document.getElementById('resultCard');

function renderResultCard(data) {
  const signalsList = (data.signals || []).map(s =>
    typeof s === 'string' ? s : (s.description || s.id || s)
  ).join(', ') || '—';
  const reasonsList = (data.reasons || []).length ? data.reasons.map(r => `<li>${r}</li>`).join('') : '<li>—</li>';
  const adviceList = (data.advice || []).length ? data.advice.map(a => `<li>${a}</li>`).join('') : '<li>—</li>';

  return `
    <div class="riskHeader">
      <span class="riskScore">${data.riskScore ?? 0}</span>
      <span class="riskLevel ${(data.riskLevel || 'low')}">${data.riskLevel || 'low'}</span>
    </div>
    <div class="resultField">
      <strong>Signals</strong>
      <p>${signalsList}</p>
    </div>
    <div class="resultField">
      <strong>Reasons</strong>
      <ul>${reasonsList}</ul>
    </div>
    <div class="resultField">
      <strong>Advice</strong>
      <ul>${adviceList}</ul>
    </div>
  `;
}

function setLoading(loading) {
  analyzeBtn.disabled = loading;
  if (loading) {
    resultPlaceholder.textContent = 'Analyzing...';
    resultPlaceholder.classList.remove('hidden');
    resultCard.classList.add('hidden');
  }
}

function setError(msg) {
  resultPlaceholder.textContent = msg;
  resultPlaceholder.className = 'resultPlaceholder error';
  resultPlaceholder.classList.remove('hidden');
  resultCard.classList.add('hidden');
}

function setResult(data) {
  resultPlaceholder.classList.add('hidden');
  resultCard.innerHTML = renderResultCard(data);
  resultCard.classList.remove('hidden');
}

async function analyze() {
  const text = textInput.value.trim();
  if (!text) {
    setError('Please enter some text.');
    return;
  }

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setResult(data);
  } catch (err) {
    setError('Backend not reachable. Start server on port 3000.');
  } finally {
    setLoading(false);
  }
}

analyzeBtn.addEventListener('click', analyze);
