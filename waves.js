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
      setTimeout(start, 50);
      return;
    }

    try {
      if (window.skyVanta && typeof window.skyVanta.destroy === 'function') {
        window.skyVanta.destroy();
      }

      window.skyVanta = window.VANTA.CLOUDS({
        el: el,
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.50,
        skyColor: 0x020204,
        cloudColor: 0x0e0e12,
        cloudShadowColor: 0x010102,
        sunColor: 0x14141a,
        sunlightColor: 0x14141a,
        sunGlareColor: 0x050507,
        backgroundColor: 0x020204,
        speed: 0.75
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
