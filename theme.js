(function() {
  const saved = localStorage.getItem('sky_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();
