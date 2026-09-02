"use client";

import { useEffect, useRef } from "react";

/**
 * HeroCanvas — animated organic blob background in Keepr wine/amber palette.
 * Deep #64181a wine, amber/gold highlights, near-black voids, halftone grain.
 * Pure canvas, zero dependencies, GPU-composited with willReadFrequently=false.
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
      { r: 10,  g: 4,   b: 4   },  // near-black void
      { r: 180, g: 90,  b: 8   },  // amber/gold warm
      { r: 140, g: 50,  b: 12  },  // burnt sienna
      { r: 50,  g: 10,  b: 8   },  // very dark maroon
      { r: 200, g: 120, b: 20  },  // bright gold accent
    ];

    // ── Resize helper ──────────────────────────────────────────────────────
    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
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
      const w = canvas!.width;
      const h = canvas!.height;
      const count = 8;
      const blobs: Blob[] = [];
      for (let i = 0; i < count; i++) {
        const col = PALETTE[i % PALETTE.length];
        blobs.push({
          cx: Math.random() * w,
          cy: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.22,
          r: w * (0.25 + Math.random() * 0.35),
          color: col,
          phase: Math.random() * Math.PI * 2,
          speed: 0.003 + Math.random() * 0.005,
          wobble: 0.06 + Math.random() * 0.1,
        });
      }
      return blobs;
    }

    let blobs = makeBlobs();

    // ── Halftone grain pass ───────────────────────────────────────────────
    // We draw a grid of translucent dark dots on top using a sinusoidal pattern
    // to simulate the coarse halftone seen in the reference image.
    function drawHalftone() {
      if (!ctx || !canvas) return;
      const spacing = 6;
      const w = canvas.width;
      const h = canvas.height;
      ctx.save();
      for (let y = 0; y < h; y += spacing) {
        for (let x = 0; x < w; x += spacing) {
          // vary opacity by position to give organic feel
          const n =
            Math.sin(x * 0.015) *
            Math.cos(y * 0.015) *
            0.5 +
            0.5;
          const alpha = n * 0.18;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#000000";
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // ── Main render loop ──────────────────────────────────────────────────
    let frame = 0;
    let rafId = 0;
    let prevW = canvas.width;
    let prevH = canvas.height;

    function render() {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;

      // Rebuild blobs on size change
      if (w !== prevW || h !== prevH) {
        prevW = w; prevH = h;
        blobs = makeBlobs();
      }

      frame++;

      // ── Clear with deep near-black base ───────────────────────────────
      ctx.fillStyle = "#080202";
      ctx.fillRect(0, 0, w, h);

      // ── Draw blobs as radial gradients ────────────────────────────────
      for (const blob of blobs) {
        // Organic movement: sinusoidal drift + bounce
        blob.cx += blob.vx + Math.sin(frame * blob.speed + blob.phase) * 0.4;
        blob.cy += blob.vy + Math.cos(frame * blob.speed * 0.7 + blob.phase) * 0.3;

        // Soft wall bounce
        if (blob.cx < -blob.r * 0.5) blob.vx = Math.abs(blob.vx);
        if (blob.cx > w + blob.r * 0.5) blob.vx = -Math.abs(blob.vx);
        if (blob.cy < -blob.r * 0.5) blob.vy = Math.abs(blob.vy);
        if (blob.cy > h + blob.r * 0.5) blob.vy = -Math.abs(blob.vy);

        // Wobble radius
        const wobbledR = blob.r * (1 + Math.sin(frame * blob.speed * 1.3) * blob.wobble);

        const { r, g, b } = blob.color;
        const grad = ctx.createRadialGradient(
          blob.cx, blob.cy, 0,
          blob.cx, blob.cy, wobbledR,
        );
        grad.addColorStop(0,   `rgba(${r},${g},${b},0.82)`);
        grad.addColorStop(0.45, `rgba(${r},${g},${b},0.45)`);
        grad.addColorStop(0.75, `rgba(${r},${g},${b},0.18)`);
        grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);

        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(
          blob.cx, blob.cy,
          wobbledR,
          wobbledR * (0.7 + Math.sin(frame * blob.speed * 0.9) * 0.15),
          frame * 0.0008 + blob.phase,
          0, Math.PI * 2,
        );
        ctx.fill();
      }

      // ── Reset composite and apply halftone dots ───────────────────────
      ctx.globalCompositeOperation = "source-over";
      drawHalftone();

      // ── Vignette overlay — deep black edge fade ───────────────────────
      const vignette = ctx.createRadialGradient(
        w * 0.5, h * 0.5, Math.min(w, h) * 0.15,
        w * 0.5, h * 0.5, Math.max(w, h) * 0.82,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(0.6, "rgba(0,0,0,0.25)");
      vignette.addColorStop(1,   "rgba(0,0,0,0.78)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      rafId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full"
      style={{ display: "block" }}
    />
  );
}
