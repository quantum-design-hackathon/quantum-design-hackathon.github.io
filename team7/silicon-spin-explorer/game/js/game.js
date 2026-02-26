
(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const state = {
    w: 800, h: 600,
    running: false,
    last: performance.now(),
    score: 0,
    misses: 0,
    paddle: { x: 0, y: 0, w: 140, h: 16, vx: 0 },
    drops: [],
    spawnT: 0,
    // control
    targetX: null,
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    state.w = Math.max(320, Math.floor(rect.width));
    state.h = Math.max(320, Math.floor(rect.height));
    canvas.width = Math.floor(state.w * dpr);
    canvas.height = Math.floor(state.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    state.paddle.y = state.h - 46;
    if (state.paddle.x === 0) state.paddle.x = state.w / 2;
  }

  function reset() {
    state.score = 0;
    state.misses = 0;
    state.drops = [];
    state.spawnT = 0;
    state.paddle.x = state.w / 2;
    state.targetX = state.paddle.x;
    updateHUD();
  }

  function updateHUD() {
    const s = document.getElementById('score');
    const m = document.getElementById('misses');
    if (s) s.textContent = String(state.score);
    if (m) m.textContent = String(state.misses);
  }

  function spawnDrop() {
    const r = 8 + Math.random() * 10;
    state.drops.push({
      x: 20 + Math.random() * (state.w - 40),
      y: -20,
      vy: 120 + Math.random() * 160,
      r,
      phase: Math.random() * Math.PI * 2
    });
  }

  function step(dt) {
    // spawn rate ramps with score
    const spawnEvery = Math.max(0.35, 1.0 - state.score * 0.015);
    state.spawnT += dt;
    while (state.spawnT > spawnEvery) {
      state.spawnT -= spawnEvery;
      spawnDrop();
    }

    // paddle control (smooth)
    if (state.targetX != null) {
      const dx = state.targetX - state.paddle.x;
      state.paddle.x += dx * Math.min(1, dt * 8);
    }

    // drops
    const px0 = state.paddle.x - state.paddle.w / 2;
    const px1 = state.paddle.x + state.paddle.w / 2;
    const py0 = state.paddle.y;
    const py1 = state.paddle.y + state.paddle.h;

    for (let i = state.drops.length - 1; i >= 0; i--) {
      const d = state.drops[i];
      d.y += d.vy * dt;
      d.phase += dt * 6;

      // collision (circle vs paddle AABB)
      const cx = Math.max(px0, Math.min(d.x, px1));
      const cy = Math.max(py0, Math.min(d.y, py1));
      const dx = d.x - cx;
      const dy = d.y - cy;
      if (dx * dx + dy * dy < d.r * d.r) {
        state.drops.splice(i, 1);
        state.score += 1;
        updateHUD();
        continue;
      }

      if (d.y - d.r > state.h + 30) {
        state.drops.splice(i, 1);
        state.misses += 1;
        updateHUD();
        if (state.misses >= 10) {
          state.running = false;
          showBanner('Game over — hit Reset to try again');
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, state.w, state.h);

    // background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, state.w, state.h);

    // guide line
    ctx.strokeStyle = '#dadce0';
    ctx.beginPath();
    ctx.moveTo(0, state.paddle.y);
    ctx.lineTo(state.w, state.paddle.y);
    ctx.stroke();

    // drops ("electrons")
    for (const d of state.drops) {
      const glow = 0.35 + 0.25 * Math.sin(d.phase);
      ctx.fillStyle = `rgba(26,115,232,${0.55 + glow})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(26,115,232,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // paddle
    const x0 = state.paddle.x - state.paddle.w / 2;
    ctx.fillStyle = '#202124';
    roundRect(ctx, x0, state.paddle.y, state.paddle.w, state.paddle.h, 10);
    ctx.fill();

    // hint
    ctx.fillStyle = '#5f6368';
    ctx.font = '12px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText('Pinch + drag to move (or mouse)', 16, 22);
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - state.last) / 1000);
    state.last = now;

    if (state.running) step(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function showBanner(text) {
    const b = document.getElementById('banner');
    if (b) {
      b.textContent = text;
      b.style.display = 'block';
    }
  }
  function hideBanner() {
    const b = document.getElementById('banner');
    if (b) b.style.display = 'none';
  }

  // Input fallback
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    state.targetX = x;
  });

  // Buttons
  document.getElementById('btn-start')?.addEventListener('click', async () => {
    hideBanner();
    state.running = true;

    // Start hand tracking
    if (typeof HandTracking !== 'undefined') {
      try {
        await HandTracking.start();
      } catch (_) {}
    }
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    hideBanner();
    reset();
    state.running = true;
  });

  document.getElementById('btn-stop')?.addEventListener('click', () => {
    state.running = false;
    showBanner('Paused — press Start');
    if (typeof HandTracking !== 'undefined') HandTracking.stop();
  });

  // Wire HandTracking callbacks
  if (typeof HandTracking !== 'undefined') {
    HandTracking.init({
      onRotate: (dx, _dy) => {
        // pinch-drag dx is "radians-ish" from main.js; map to pixels
        const speed = 520; // px per "unit"
        const newX = (state.targetX ?? state.paddle.x) + dx * speed;
        state.targetX = Math.max(state.paddle.w / 2, Math.min(state.w - state.paddle.w / 2, newX));
      },
      onTemperatureChange: (_t) => {},
      onBFieldChange: (_b) => {}
    });
  }

  // boot
  window.addEventListener('resize', resize);
  resize();
  reset();
  showBanner('Press Start. Allow camera access for hand control.');
  requestAnimationFrame(loop);
})();
