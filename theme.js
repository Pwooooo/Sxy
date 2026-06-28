(function() {
  const saved = localStorage.getItem('sxy_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();
