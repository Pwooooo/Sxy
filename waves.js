/**
 * Sky — Highly Complex & Detailed Volumetric Cloudscape Engine
 * 
 * Features:
 * - Multi-layered 3D atmospheric cloudscape (Cirrus, Cumulus, Stratocumulus, Foreground Mist)
 * - Cached high-resolution volumetric cloud puff sprites for 60fps performance
 * - Organic Simplex Noise morphing, billowing, and vapor condensation
 * - Interactive Aerodynamic Physics: cursor velocity imparts wind vectors, parting clouds with wake vortex
 * - Dynamic condensation trails & spinning vapor vortex particles in cursor slipstream
 * - Cirrus jetstream streamlines flowing along curl noise vector fields
 * - Stratospheric ice crystals / micro-stars with deep cosmic parallax
 * - Pure Monochrome: Obsidian (#08080a), Charcoal, Silver-Lining Specular Rims, Pure White Highlights
 */

(function () {
  const canvas = document.getElementById('waves');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let time = 0;
  let lastTime = performance.now();

  // -------------------------------------------------------------
  // Mouse & Interactive Aerodynamics
  // -------------------------------------------------------------
  const mouse = {
    x: -2000,
    y: -2000,
    prevX: -2000,
    prevY: -2000,
    targetX: -2000,
    targetY: -2000,
    vx: 0,
    vy: 0,
    speed: 0,
    active: false,
    radius: 260,
    wakeTimer: 0
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

  // -------------------------------------------------------------
  // Fast 2D Simplex Noise Generator
  // -------------------------------------------------------------
  function createSimplexNoise() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.sin(i * 123.456 + 7.89) * 100000) & 255;
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

  function fbm(x, y, octaves = 3) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1.0;
    for (let o = 0; o < octaves; o++) {
      value += amplitude * noise2D(x * frequency, y * frequency);
      frequency *= 2.08;
      amplitude *= 0.46;
    }
    return value;
  }

  // -------------------------------------------------------------
  // Pre-rendered Volumetric Cloud Vapor Sprites (Offscreen Canvas)
  // -------------------------------------------------------------
  const SPRITE_SIZE = 256;
  const cloudSprites = [];

  function createCloudSprite(type) {
    const c = document.createElement('canvas');
    c.width = SPRITE_SIZE;
    c.height = SPRITE_SIZE;
    const ctxC = c.getContext('2d');
    const center = SPRITE_SIZE / 2;

    const grad = ctxC.createRadialGradient(center, center * 0.95, 0, center, center, center);

    if (type === 'cumulus') {
      // Billowing soft cumulus puff with silver-lining rim
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.24)');
      grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else if (type === 'cirrus') {
      // Wispy, stratified feather vapor
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.1)');
      grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.03)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else {
      // Deep stratospheric ambient mist
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }

    ctxC.fillStyle = grad;
    ctxC.beginPath();
    ctxC.arc(center, center, center, 0, Math.PI * 2);
    ctxC.fill();

    return c;
  }

  cloudSprites.push(createCloudSprite('cumulus'));
  cloudSprites.push(createCloudSprite('cirrus'));
  cloudSprites.push(createCloudSprite('mist'));

  // -------------------------------------------------------------
  // Stratospheric Ice Crystals & Micro-Stars (Cosmic Background)
  // -------------------------------------------------------------
  const STAR_COUNT = 90;
  const stars = [];

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseAlpha: Math.random() * 0.45 + 0.15,
        twinkleSpeed: Math.random() * 1.8 + 0.6,
        phase: Math.random() * Math.PI * 2,
        radius: Math.random() * 1.4 + 0.4,
        parallax: Math.random() * 0.03 + 0.01
      });
    }
  }

  // -------------------------------------------------------------
  // Volumetric Cloud Puff Nodes (Atmospheric Cloud Banks)
  // -------------------------------------------------------------
  const CLOUD_COUNT = 75;
  const clouds = [];

  function initClouds() {
    clouds.length = 0;

    // Distribute clouds in 3 elevation strata
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const layer = i < 22 ? 0 : i < 54 ? 1 : 2; // 0: Deep background, 1: Mid Cumulus, 2: Foreground Mist
      const sizeMultiplier = layer === 0 ? 2.8 : layer === 1 ? 1.6 : 1.1;

      clouds.push({
        layer: layer,
        spriteIdx: layer === 0 ? 2 : layer === 1 ? 0 : 1,
        x: Math.random() * (width + 600) - 300,
        y: Math.random() * (height + 200) - 100,
        baseX: 0,
        baseY: 0,
        vx: (layer === 0 ? 0.06 : layer === 1 ? 0.14 : 0.28) + (Math.random() * 0.05),
        vy: (Math.random() - 0.5) * 0.04,
        baseSize: (Math.random() * 130 + 170) * sizeMultiplier,
        scale: 1,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.0015,
        baseAlpha: layer === 0 ? (Math.random() * 0.12 + 0.08) : layer === 1 ? (Math.random() * 0.22 + 0.14) : (Math.random() * 0.14 + 0.06),
        noiseOffset: Math.random() * 1000,
        // Aerodynamic physics offsets
        dispX: 0,
        dispY: 0,
        dispVx: 0,
        dispVy: 0
      });
    }
  }

  // -------------------------------------------------------------
  // Cirrus Jetstream Wind Streamlines
  // -------------------------------------------------------------
  const STREAMLINE_COUNT = 18;
  const streamlines = [];

  function initStreamlines() {
    streamlines.length = 0;
    for (let i = 0; i < STREAMLINE_COUNT; i++) {
      streamlines.push({
        yBase: (height / (STREAMLINE_COUNT + 1)) * (i + 1),
        speed: Math.random() * 0.2 + 0.12,
        amplitude: Math.random() * 32 + 20,
        frequency: Math.random() * 0.0018 + 0.0012,
        alpha: Math.random() * 0.16 + 0.06,
        phase: Math.random() * Math.PI * 2,
        lineWidth: Math.random() * 1.2 + 0.6
      });
    }
  }

  // -------------------------------------------------------------
  // Dynamic Cursor Slipstream Vapor Vortex Trail
  // -------------------------------------------------------------
  const MAX_VORTEX = 60;
  const vortices = [];

  function spawnVortex(x, y, vx, vy) {
    if (vortices.length >= MAX_VORTEX) vortices.shift();
    const speed = Math.hypot(vx, vy);
    const spread = Math.random() * 14 - 7;
    vortices.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: vx * 0.15 + (Math.random() - 0.5) * 1.2,
      vy: vy * 0.15 + (Math.random() - 0.5) * 1.2,
      size: Math.random() * 35 + 25 + speed * 0.8,
      growRate: Math.random() * 1.2 + 0.8,
      angle: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.08,
      alpha: Math.min(0.45, 0.15 + speed * 0.012),
      decay: Math.random() * 0.012 + 0.008,
      spriteIdx: Math.random() > 0.5 ? 0 : 1
    });
  }

  // -------------------------------------------------------------
  // Resize Handling
  // -------------------------------------------------------------
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

    initStars();
    initClouds();
    initStreamlines();
  }

  window.addEventListener('resize', resize);
  resize();

  // -------------------------------------------------------------
  // Main Atmospheric Render Loop
  // -------------------------------------------------------------
  function render(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    time += dt;

    // Track mouse velocity and wake physics
    if (mouse.active) {
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;
      mouse.vx = mouse.x - mouse.prevX;
      mouse.vy = mouse.y - mouse.prevY;
      mouse.speed = Math.hypot(mouse.vx, mouse.vy);

      // Spawn swirling vapor clouds when moving through the sky
      if (mouse.speed > 1.2) {
        mouse.wakeTimer += dt;
        if (mouse.wakeTimer > 0.035) {
          spawnVortex(mouse.x, mouse.y, mouse.vx, mouse.vy);
          mouse.wakeTimer = 0;
        }
      }
    } else {
      mouse.x += (-2000 - mouse.x) * 0.05;
      mouse.y += (-2000 - mouse.y) * 0.05;
      mouse.speed = 0;
    }

    ctx.clearRect(0, 0, width, height);

    // -------------------------------------------------------------
    // Layer 1: Stratospheric Space & Starfield (Ice Crystals)
    // -------------------------------------------------------------
    const mouseShiftX = mouse.active ? (mouse.x - width / 2) * 0.02 : 0;
    const mouseShiftY = mouse.active ? (mouse.y - height / 2) * 0.02 : 0;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const twinkle = s.baseAlpha * (0.65 + 0.35 * Math.sin(time * s.twinkleSpeed + s.phase));
      const sx = s.x - mouseShiftX * s.parallax * 30;
      const sy = s.y - mouseShiftY * s.parallax * 30;

      ctx.beginPath();
      ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle.toFixed(3)})`;
      ctx.fill();
    }

    // -------------------------------------------------------------
    // Layer 2: Ambient Stratospheric Sky Glow (Lunar Illumination)
    // -------------------------------------------------------------
    const haloX = mouse.active ? mouse.x : width * 0.5;
    const haloY = mouse.active ? mouse.y : height * 0.25;
    const skyHaloRadius = Math.max(width, height) * 0.7;
    const skyHalo = ctx.createRadialGradient(haloX, haloY, 0, haloX, haloY, skyHaloRadius);
    skyHalo.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    skyHalo.addColorStop(0.4, 'rgba(255, 255, 255, 0.012)');
    skyHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = skyHalo;
    ctx.fillRect(0, 0, width, height);

    // -------------------------------------------------------------
    // Layer 3: Cirrus Jetstream Streamlines (Wind Flow)
    // -------------------------------------------------------------
    const stepX = 16;
    for (let i = 0; i < streamlines.length; i++) {
      const line = streamlines[i];
      ctx.beginPath();
      let first = true;

      for (let x = 0; x <= width + stepX; x += stepX) {
        const normX = x / width;
        const wave = Math.sin(normX * 6 + time * line.speed + line.phase) * line.amplitude;
        const turbulence = fbm(normX * 2.5 + time * 0.08, i * 0.4, 2) * 22;

        // Mouse atmospheric distortion
        let mouseDisplace = 0;
        if (mouse.active) {
          const dx = x - mouse.x;
          const dy = line.yBase - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < mouse.radius * mouse.radius) {
            const factor = 1 - distSq / (mouse.radius * mouse.radius);
            mouseDisplace = Math.sin(Math.sqrt(distSq) * 0.05 - time * 5) * 35 * factor * factor;
          }
        }

        const y = line.yBase + wave + turbulence + mouseDisplace;

        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = `rgba(255, 255, 255, ${line.alpha.toFixed(3)})`;
      ctx.lineWidth = line.lineWidth;
      ctx.stroke();
    }

    // -------------------------------------------------------------
    // Layer 4: Volumetric Billowing Cloud Masses
    // -------------------------------------------------------------
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];

      // Drift physics with wind
      c.x += c.vx;
      c.y += c.vy;

      // Wrap around the screen borders seamlessly
      if (c.x > width + c.baseSize) c.x = -c.baseSize;
      if (c.x < -c.baseSize * 1.5) c.x = width + c.baseSize;
      if (c.y > height + c.baseSize) c.y = -c.baseSize;
      if (c.y < -c.baseSize) c.y = height + c.baseSize;

      // Organic condensation & billowing morph
      c.angle += c.rotSpeed;
      const morph = noise2D(c.x * 0.0012 + time * 0.06, c.noiseOffset);
      const currentSize = c.baseSize * (1 + morph * 0.18);
      const currentAlpha = Math.max(0.01, c.baseAlpha * (1 + morph * 0.25));

      // Interactive Aerodynamics: Cursor parts the clouds
      if (mouse.active) {
        const dx = c.x - mouse.x;
        const dy = c.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const rad = mouse.radius * (c.layer === 2 ? 1.2 : 0.9);
        const radSq = rad * rad;

        if (distSq < radSq && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / rad) * 45;
          const nx = dx / dist;
          const ny = dy / dist;

          // Push cloud puff outwards away from cursor
          c.dispVx += nx * push * 0.08;
          c.dispVy += ny * push * 0.08;
        }
      }

      // Spring damping back to equilibrium
      c.dispX += c.dispVx;
      c.dispY += c.dispVy;
      c.dispVx *= 0.88;
      c.dispVy *= 0.88;
      c.dispX *= 0.92;
      c.dispY *= 0.92;

      // Render volumetric sprite puff
      const drawX = c.x + c.dispX - mouseShiftX * (c.layer + 1) * 6;
      const drawY = c.y + c.dispY - mouseShiftY * (c.layer + 1) * 6;
      const sprite = cloudSprites[c.spriteIdx];

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(c.angle);
      ctx.globalAlpha = currentAlpha;
      ctx.drawImage(sprite, -currentSize / 2, -currentSize / 2, currentSize, currentSize);
      ctx.restore();
    }

    // -------------------------------------------------------------
    // Layer 5: Cursor Slipstream Vortices & Condensation Trails
    // -------------------------------------------------------------
    for (let i = vortices.length - 1; i >= 0; i--) {
      const v = vortices[i];
      v.x += v.vx;
      v.y += v.vy;
      v.size += v.growRate;
      v.angle += v.rotSpeed;
      v.alpha -= v.decay;

      if (v.alpha <= 0.005) {
        vortices.splice(i, 1);
        continue;
      }

      const sprite = cloudSprites[v.spriteIdx];
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);
      ctx.globalAlpha = v.alpha;
      ctx.drawImage(sprite, -v.size / 2, -v.size / 2, v.size, v.size);
      ctx.restore();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
