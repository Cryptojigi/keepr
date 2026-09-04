"use client";

import { useEffect, useRef } from "react";

/**
 * HeroCanvas — ultra-smooth animated organic blob background in Keepr wine/amber palette.
 * Deep #64181a wine, amber/gold highlights, near-black voids, pre-rendered halftone grain.
 * High-performance: pre-rendered pattern tile (0 main-thread dot loops), IntersectionObserver
 * to freeze animation when scrolled off-screen, and zero scroll jank.
 */
export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // ── Blob palette ───────────────────────────────────────────────────────
    const PALETTE = [
      { r: 100, g: 24,  b: 26  },  // #64181a — core wine
      { r: 74,  g: 16,  b: 18  },  // #4a1012 — dark wine
      { r: 12,  g: 4,   b: 5   },  // near-black void
      { r: 175, g: 85,  b: 12  },  // amber/gold warm
      { r: 135, g: 45,  b: 15  },  // burnt sienna
      { r: 45,  g: 10,  b: 10  },  // very dark maroon
      { r: 195, g: 110, b: 20  },  // bright gold accent
    ];

    // ── Pre-rendered Halftone Pattern (1000x faster than per-frame dot loops)
    let halftonePattern: CanvasPattern | null = null;
    function buildHalftonePattern() {
      const tileSize = 60; // multiple of 6
      const patternCanvas = document.createElement("canvas");
      patternCanvas.width = tileSize;
      patternCanvas.height = tileSize;
      const pCtx = patternCanvas.getContext("2d");
      if (!pCtx || !ctx) return;

      const spacing = 6;
      for (let y = 0; y < tileSize; y += spacing) {
        for (let x = 0; x < tileSize; x += spacing) {
          const n =
            Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
          const alpha = 0.03 + n * 0.13;
          pCtx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
          pCtx.beginPath();
          pCtx.arc(x, y, 1.3, 0, Math.PI * 2);
          pCtx.fill();
        }
      }
      halftonePattern = ctx.createPattern(patternCanvas, "repeat");
    }
    buildHalftonePattern();

    // ── Resize helper ──────────────────────────────────────────────────────
    function resize() {
      if (!canvas) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        if (!halftonePattern) buildHalftonePattern();
      }
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Blob definitions ──────────────────────────────────────────────────
    type Blob = {
      cx: number; cy: number;
      vx: number; vy: number;
      r: number;
      color: { r: number; g: number; b: number };
      phase: number; speed: number;
      wobble: number;
    };

    function makeBlobs(): Blob[] {
      const w = canvas!.width || 800;
      const h = canvas!.height || 400;
      const count = 7;
      const blobs: Blob[] = [];
      for (let i = 0; i < count; i++) {
        const col = PALETTE[i % PALETTE.length];
        blobs.push({
          cx: Math.random() * w,
          cy: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.18,
          r: w * (0.24 + Math.random() * 0.32),
          color: col,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0025 + Math.random() * 0.004,
          wobble: 0.05 + Math.random() * 0.08,
        });
      }
      return blobs;
    }

    let blobs = makeBlobs();

    // ── Visibility & Animation State ───────────────────────────────────────
    let frame = 0;
    let rafId = 0;
    let isVisible = true;
    let prevW = canvas.width;
    let prevH = canvas.height;

    function render() {
      if (!ctx || !canvas || !isVisible) return;
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      // Rebuild blobs on significant size change
      if (Math.abs(w - prevW) > 50 || Math.abs(h - prevH) > 50) {
        prevW = w; prevH = h;
        blobs = makeBlobs();
      }

      frame++;

      // 1. Clear with deep near-black base
      ctx.fillStyle = "#080202";
      ctx.fillRect(0, 0, w, h);

      // 2. Draw blobs as radial gradients with additive blending
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < blobs.length; i++) {
        const blob = blobs[i];

        // Smooth sinusoidal drift
        blob.cx += blob.vx + Math.sin(frame * blob.speed + blob.phase) * 0.35;
        blob.cy += blob.vy + Math.cos(frame * blob.speed * 0.7 + blob.phase) * 0.25;

        // Soft wall bounce
        if (blob.cx < -blob.r * 0.4) blob.vx = Math.abs(blob.vx);
        if (blob.cx > w + blob.r * 0.4) blob.vx = -Math.abs(blob.vx);
        if (blob.cy < -blob.r * 0.4) blob.vy = Math.abs(blob.vy);
        if (blob.cy > h + blob.r * 0.4) blob.vy = -Math.abs(blob.vy);

        // Wobble radius
        const wobbledR = blob.r * (1 + Math.sin(frame * blob.speed * 1.2) * blob.wobble);

        const { r, g, b } = blob.color;
        const grad = ctx.createRadialGradient(
          blob.cx, blob.cy, 0,
          blob.cx, blob.cy, wobbledR,
        );
        grad.addColorStop(0,    `rgba(${r},${g},${b},0.80)`);
        grad.addColorStop(0.42, `rgba(${r},${g},${b},0.42)`);
        grad.addColorStop(0.72, `rgba(${r},${g},${b},0.15)`);
        grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(
          blob.cx, blob.cy,
          wobbledR,
          wobbledR * (0.72 + Math.sin(frame * blob.speed * 0.8) * 0.12),
          frame * 0.0006 + blob.phase,
          0, Math.PI * 2,
        );
        ctx.fill();
      }

      // 3. Apply pre-rendered halftone tile (single GPU fillRect instead of 40,000 arcs)
      ctx.globalCompositeOperation = "source-over";
      if (halftonePattern) {
        ctx.fillStyle = halftonePattern;
        ctx.fillRect(0, 0, w, h);
      }

      // 4. Vignette overlay — smooth edge fade
      const vignette = ctx.createRadialGradient(
        w * 0.5, h * 0.5, Math.min(w, h) * 0.18,
        w * 0.5, h * 0.5, Math.max(w, h) * 0.82,
      );
      vignette.addColorStop(0,   "rgba(0,0,0,0)");
      vignette.addColorStop(0.55, "rgba(0,0,0,0.22)");
      vignette.addColorStop(1,   "rgba(0,0,0,0.78)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      if (isVisible) {
        rafId = requestAnimationFrame(render);
      }
    }

    // ── IntersectionObserver: pause RAF when scrolled off-screen ──────────
    const io = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting;
        if (isVisible && !wasVisible) {
          rafId = requestAnimationFrame(render);
        } else if (!isVisible && rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      { threshold: 0.01 }
    );
    io.observe(canvas);

    rafId = requestAnimationFrame(render);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ display: "block", transform: "translateZ(0)", willChange: "transform" }}
    />
  );
}
