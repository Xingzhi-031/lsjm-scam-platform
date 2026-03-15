(function () {
  const params = new URLSearchParams(location.search);
  const ts = params.get('ts');
  const us = params.get('us');
  const textEl = document.getElementById('textScore');
  const urlEl = document.getElementById('urlScore');
  if (textEl) textEl.textContent = 'Text risk score: ' + (ts != null && ts !== '' ? ts : '—');
  if (urlEl) urlEl.textContent = 'URL risk score: ' + (us != null && us !== '' ? us : '—');
  const btn = document.getElementById('goBack');
  if (btn) btn.addEventListener('click', () => window.history.back());
})();
