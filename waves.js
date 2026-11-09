/**
 * Sky — Complex Generative Topological Background
 * Features:
 * - 2D Simplex Noise fractional Brownian motion (fBm) multi-octave wave terrain
 * - 3D depth-projected undulating contour grid
 * - Interactive mouse physics & gravitational ripple wake
 * - Floating ambient constellation nodes with proximity filaments
 * - High-DPI / Retina display auto-scaling & smooth 60fps delta timing
 * - 100% Monochrome / Obsidian & Silver aesthetic
 */

(function () {
  const canvas = document.getElementById('waves');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let time = 0;
  let lastFrameTime = performance.now();

  // Mouse physics
  const mouse = {
    x: -1000,
    y: -1000,
    targetX: -1000,
    targetY: -1000,
    active: false,
    radius: 220,
    force: 45
  };

  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouse.targetX = e.touches[0].clientX;
      mouse.targetY = e.touches[0].clientY;
      mouse.active = true;
    }
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  // Fast 2D Simplex Noise generator
  function createSimplexNoise() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.sin(i * 9999 + 1) * 100000) & 255;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const perm = new Uint8Array(512);
    const permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod12[i] = perm[i] % 12;
    }
    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    return function simplex2(xin, yin) {
      let n0 = 0, n1 = 0, n2 = 0;
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = xin - X0;
      const y0 = yin - Y0;
      let i1 = 0, j1 = 0;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1.0 + 2.0 * G2;
      const y2 = y0 - 1.0 + 2.0 * G2;
      const ii = i & 255;
      const jj = j & 255;
      const gi0 = permMod12[ii + perm[jj]];
      const gi1 = permMod12[ii + i1 + perm[jj + j1]];
      const gi2 = permMod12[ii + 1 + perm[jj + 1]];
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) {
        t0 *= t0;
        n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
      }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) {
        t1 *= t1;
        n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
      }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) {
        t2 *= t2;
        n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
      }
      return 70.0 * (n0 + n1 + n2);
    };
  }

  const noise2D = createSimplexNoise();

  // Fractional Brownian Motion (fBm)
  function fbm(x, y, octaves = 3) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1.0;
    for (let o = 0; o < octaves; o++) {
      value += amplitude * noise2D(x * frequency, y * frequency);
      frequency *= 2.05;
      amplitude *= 0.48;
    }
    return value;
  }

  // Constellation Particles
  const PARTICLE_COUNT = 45;
  const particles = [];

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.5 + 0.6,
        alpha: Math.random() * 0.35 + 0.15,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    initParticles();
  }

  window.addEventListener('resize', resize);
  resize();

  // Main Render Loop
  function render(now) {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    time += dt * 0.35;

    // Smooth mouse interpolation
    if (mouse.active) {
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;
    } else {
      mouse.x += (-1000 - mouse.x) * 0.05;
      mouse.y += (-1000 - mouse.y) * 0.05;
    }

    ctx.clearRect(0, 0, width, height);

    // Dynamic wave color from theme (default pure white)
    const cs = getComputedStyle(document.documentElement);
    const wc = cs.getPropertyValue('--wave-color').trim() || '255, 255, 255';

    // -------------------------------------------------------------
    // Layer 1: Ambient Horizon Light Pulse
    // -------------------------------------------------------------
    const glowX = mouse.active ? mouse.x : width * 0.5;
    const glowY = mouse.active ? mouse.y : height * 0.2;
    const ambientRad = Math.max(width, height) * 0.65;
    const ambientGlow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, ambientRad);
    ambientGlow.addColorStop(0, `rgba(${wc}, 0.035)`);
    ambientGlow.addColorStop(0.5, `rgba(${wc}, 0.008)`);
    ambientGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, width, height);

    // -------------------------------------------------------------
    // Layer 2: 3D Topological Contour Field
    // -------------------------------------------------------------
    const lineCount = Math.floor(Math.min(32, Math.max(22, height / 32)));
    const spacing = height / (lineCount + 1);
    const stepX = Math.max(5, Math.floor(width / 160));

    for (let i = 0; i < lineCount; i++) {
      const normY = i / lineCount;
      const yBase = (i + 1) * spacing;

      // Depth weighting: lines near center have richer visibility
      const distFromCenter = Math.abs(normY - 0.5) * 2;
      const depthAlpha = (0.05 + (1 - distFromCenter * 0.4) * 0.16);

      ctx.beginPath();
      let first = true;
      let crestGlowMax = 0;

      for (let x = 0; x <= width + stepX; x += stepX) {
        const normX = x / width;

        // Multi-octave wave synthesis
        const n1 = fbm(normX * 1.8 + time * 0.25, normY * 2.2 + time * 0.12, 3);
        const n2 = Math.sin(normX * 5.0 + time * 0.5 + i * 0.35) * 0.5;
        const n3 = Math.cos(normX * 3.2 - time * 0.3 + i * 0.5) * 0.3;

        // Wave elevation in pixels
        const amp = 34 + normY * 18;
        let elevation = (n1 * 1.2 + n2 * 0.8 + n3 * 0.5) * amp;

        // Interactive mouse gravity displacement
        const dx = x - mouse.x;
        const dy = yBase - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = mouse.radius * mouse.radius;

        if (distSq < radiusSq) {
          const factor = 1 - distSq / radiusSq;
          const bell = factor * factor * (3 - 2 * factor);
          const warp = Math.sin(Math.sqrt(distSq) * 0.08 - time * 6) * mouse.force * bell;
          elevation += warp;
        }

        const y = yBase + elevation;

        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }

        if (Math.abs(n1) > crestGlowMax) crestGlowMax = Math.abs(n1);
      }

      // Specular highlight stroke
      const finalAlpha = Math.min(0.65, depthAlpha + crestGlowMax * 0.12);
      ctx.strokeStyle = `rgba(${wc}, ${finalAlpha.toFixed(3)})`;
      ctx.lineWidth = i % 4 === 0 ? 1.4 : 0.85;
      ctx.stroke();
    }

    // -------------------------------------------------------------
    // Layer 3: Floating Constellation Particles & Proximity Filaments
    // -------------------------------------------------------------
    const maxLinkDist = 110;
    const maxLinkDistSq = maxLinkDist * maxLinkDist;

    // Draw connecting filaments
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < maxLinkDistSq) {
          const linkAlpha = (1 - dSq / maxLinkDistSq) * 0.12;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${wc}, ${linkAlpha.toFixed(3)})`;
          ctx.lineWidth = 0.65;
          ctx.stroke();
        }
      }
    }

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Move particle
      p.x += p.vx;
      p.y += p.vy;

      // Mouse gentle repulsion
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < 18000 && dSq > 1) {
          const d = Math.sqrt(dSq);
          const f = (1 - d / 134) * 0.8;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
      }

      // Screen wrapping
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      // Breathing pulse
      const currentAlpha = p.alpha * (0.8 + 0.2 * Math.sin(time * 3 + p.pulseOffset));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${wc}, ${currentAlpha.toFixed(3)})`;
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
