(function() {
  const saved = localStorage.getItem('sky_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();
