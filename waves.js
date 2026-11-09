/**
 * Sky — Vanta 3D Volumetric Raymarched Cloud Simulation
 * + Aerodynamic Atmospheric Vapor Slipstream & Cursor Vortices
 * Pure Monochrome Black & White / Deep Obsidian & Silver
 */

(function initSkyAtmosphere() {
  function startVanta() {
    let el = document.getElementById('vanta-bg') || document.getElementById('waves');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vanta-bg';
      document.body.insertBefore(el, document.body.firstChild);
    }

    if (el.tagName === 'CANVAS') {
      const div = document.createElement('div');
      div.id = el.id || 'vanta-bg';
      div.className = el.className || '';
      el.parentNode.replaceChild(div, el);
      el = div;
    }

    if (!window.VANTA || !window.VANTA.CLOUDS) {
      setTimeout(startVanta, 50);
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
        skyColor: 0x08080a,
        cloudColor: 0x363644,
        cloudShadowColor: 0x09090e,
        sunColor: 0x545464,
        sunlightColor: 0x4c4c5a,
        sunGlareColor: 0x1c1c24,
        backgroundColor: 0x08080a,
        speed: 0.85
      });
    } catch (err) {
      console.error('[Sky] Vanta Cloud initialization error:', err);
    }
  }

  // -------------------------------------------------------------
  // Interactive Atmospheric Vapor Slipstream & Aerodynamic Vortices
  // -------------------------------------------------------------
  function initVaporCursor() {
    let canvas = document.getElementById('sky-cursor-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'sky-cursor-canvas';
      canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2;pointer-events:none;';
      document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse tracking & physics
    const mouse = {
      x: -1000,
      y: -1000,
      prevX: -1000,
      prevY: -1000,
      vx: 0,
      vy: 0,
      speed: 0,
      active: false
    };

    const trailPoints = [];
    const vortices = [];
    const MAX_TRAIL = 24;
    const MAX_VORTICES = 60;

    window.addEventListener('mousemove', (e) => {
      mouse.prevX = mouse.active ? mouse.x : e.clientX;
      mouse.prevY = mouse.active ? mouse.y : e.clientY;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.vx = (mouse.x - mouse.prevX) * 0.7;
      mouse.vy = (mouse.y - mouse.prevY) * 0.7;
      mouse.speed = Math.hypot(mouse.vx, mouse.vy);
      mouse.active = true;

      // Add to slipstream ribbon
      trailPoints.unshift({
        x: mouse.x,
        y: mouse.y,
        vx: mouse.vx,
        vy: mouse.vy,
        age: 0,
        maxAge: 22,
        width: Math.min(26, Math.max(6, mouse.speed * 0.9))
      });
      if (trailPoints.length > MAX_TRAIL) trailPoints.pop();

      // Spawn aerodynamic mist vortices based on cursor speed
      if (mouse.speed > 2.5 && vortices.length < MAX_VORTICES) {
        const angle = Math.atan2(mouse.vy, mouse.vx) + Math.PI + (Math.random() - 0.5) * 1.0;
        const puffSpeed = Math.random() * 0.8 + 0.4;
        vortices.push({
          x: mouse.x + (Math.random() - 0.5) * 12,
          y: mouse.y + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * puffSpeed + (Math.random() - 0.5) * 0.4,
          vy: Math.sin(angle) * puffSpeed - 0.3,
          radius: Math.random() * 14 + 10,
          growth: Math.random() * 0.55 + 0.35,
          alpha: Math.min(0.24, 0.08 + mouse.speed * 0.007),
          decay: Math.random() * 0.005 + 0.004,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.04
        });
      }
    });

    window.addEventListener('mouseleave', () => {
      mouse.active = false;
    });

    // Animation Loop
    function render() {
      ctx.clearRect(0, 0, width, height);

      // Fade trail points
      for (let i = trailPoints.length - 1; i >= 0; i--) {
        const pt = trailPoints[i];
        pt.age++;
        pt.x += pt.vx * 0.12;
        pt.y += pt.vy * 0.12 - 0.2;
        pt.vx *= 0.94;
        pt.vy *= 0.94;
        if (pt.age >= pt.maxAge) {
          trailPoints.splice(i, 1);
        }
      }

      // Draw continuous atmospheric vapor slipstream ribbon
      if (trailPoints.length > 2) {
        for (let i = 0; i < trailPoints.length - 1; i++) {
          const p0 = trailPoints[i];
          const p1 = trailPoints[i + 1];
          const life = 1 - (p0.age / p0.maxAge);
          const segAlpha = life * life * 0.18;
          const segWidth = p0.width * life;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineWidth = segWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = `rgba(255, 255, 255, ${segAlpha.toFixed(3)})`;
          ctx.stroke();

          // Soft ambient outer haze around ribbon
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineWidth = segWidth * 2.2;
          ctx.strokeStyle = `rgba(255, 255, 255, ${(segAlpha * 0.35).toFixed(3)})`;
          ctx.stroke();
        }
      }

      // Update & render billowing condensation vortices
      for (let i = vortices.length - 1; i >= 0; i--) {
        const v = vortices[i];
        v.x += v.vx;
        v.y += v.vy;
        v.radius += v.growth;
        v.rot += v.rotSpeed;
        v.alpha -= v.decay;
        v.vx *= 0.97;
        v.vy *= 0.97;

        if (v.alpha <= 0.005) {
          vortices.splice(i, 1);
          continue;
        }

        const grad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.radius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${(v.alpha * 1.2).toFixed(3)})`);
        grad.addColorStop(0.4, `rgba(220, 225, 235, ${(v.alpha * 0.7).toFixed(3)})`);
        grad.addColorStop(0.8, `rgba(180, 185, 195, ${(v.alpha * 0.25).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Soft luminous lunar halo directly over cursor
      if (mouse.active) {
        const haloRadius = 75;
        const halo = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, haloRadius);
        halo.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
        halo.addColorStop(0.3, 'rgba(255, 255, 255, 0.035)');
        halo.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  function start() {
    startVanta();
    initVaporCursor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
