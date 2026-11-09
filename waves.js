/**
 * Sky — Vanta 3D Volumetric Raymarched Cloud Simulation
 * Pure Monochrome Black & White / Deep Obsidian & Silver
 */

(function initSkyClouds() {
  function start() {
    let el = document.getElementById('vanta-bg') || document.getElementById('waves');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vanta-bg';
      document.body.insertBefore(el, document.body.firstChild);
    }

    // Canvas nodes cannot have children (Vanta appends WebGL renderer DOM element)
    if (el.tagName === 'CANVAS') {
      const div = document.createElement('div');
      div.id = el.id || 'vanta-bg';
      div.className = el.className || '';
      el.parentNode.replaceChild(div, el);
      el = div;
    }

    if (!window.VANTA || !window.VANTA.CLOUDS) {
      console.warn('[Sky] Vanta Clouds not loaded yet, retrying...');
      setTimeout(start, 50);
      return;
    }

    try {
      if (window.skyVanta && typeof window.skyVanta.destroy === 'function') {
        window.skyVanta.destroy();
      }

      window.skyVanta = window.VANTA.CLOUDS({
        el: el,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.50,
        skyColor: 0x070709,
        cloudColor: 0x484852,
        cloudShadowColor: 0x000000,
        sunColor: 0x666666,
        sunlightColor: 0x555555,
        sunGlareColor: 0x1f1f22,
        backgroundColor: 0x070709,
        speed: 0.85
      });
    } catch (err) {
      console.error('[Sky] Vanta Cloud initialization error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
