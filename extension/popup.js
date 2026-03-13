const API_BASE = 'http://localhost:3000';

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const resultEl = document.getElementById('result');
  resultEl.textContent = 'Analyzing...';
  resultEl.className = 'resultPlaceholder';

  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    resultEl.textContent = `Backend: ${data.status}`;
    resultEl.className = 'result';
  } catch (err) {
    resultEl.textContent = 'Error: Backend not reachable. Start the server on port 3000.';
    resultEl.className = 'result error';
  }
});
