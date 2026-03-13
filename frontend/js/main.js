const API_BASE = window.location.origin;

const textInput = document.getElementById('text-input');
const analyzeBtn = document.getElementById('analyze-btn');
const resultPlaceholder = document.getElementById('result-placeholder');

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
    setResult('Analyzing...');
  }
}

async function analyze() {
  const text = textInput.value.trim();
  if (!text) {
    setResult('Please enter some text to analyze.');
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
    setResult('Error: Could not reach the analysis service. Is the backend running?');
  } finally {
    setLoading(false);
  }
}

analyzeBtn.addEventListener('click', analyze);
