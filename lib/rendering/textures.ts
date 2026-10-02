import * as THREE from "three";
import type { PlanetData } from "@/types/planet";

/** Deterministic PRNG so textures are identical on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return [c, ctx];
}

function bands(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, palette: string[], count: number) {
  let y = 0;
  while (y < h) {
    const bh = (h / count) * (0.4 + rnd() * 1.2);
    ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
    ctx.globalAlpha = 0.55 + rnd() * 0.4;
    ctx.fillRect(0, y, w, bh);
    y += bh;
  }
  ctx.globalAlpha = 1;
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, n: number, colors: string[], maxR: number) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.globalAlpha = 0.08 + rnd() * 0.25;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 1 + rnd() * maxR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Blobby continents via many overlapping translucent circles, wrapped horizontally. */
function continents(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number) {
  const land = ["#3e6b3a", "#5a7d3f", "#8a8a52", "#6b5a3a"];
  for (let i = 0; i < 70; i++) {
    const cx = rnd() * w;
    const cy = h * (0.15 + rnd() * 0.7);
    const r = 12 + rnd() * (w / 14);
    ctx.fillStyle = land[Math.floor(rnd() * land.length)];
    for (const dx of [-w, 0, w]) {
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy, r, r * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  const ice = ctx.createLinearGradient(0, 0, 0, h);
  ice.addColorStop(0, "rgba(245,250,255,0.95)");
  ice.addColorStop(0.1, "rgba(245,250,255,0)");
  ice.addColorStop(0.9, "rgba(245,250,255,0)");
  ice.addColorStop(1, "rgba(245,250,255,0.95)");
  ctx.fillStyle = ice;
  ctx.fillRect(0, 0, w, h);
}

export function createSurfaceCanvas(p: Pick<PlanetData, "id" | "surface">, width: number): HTMLCanvasElement {
  const w = width;
  const h = width / 2;
  const [canvas, ctx] = makeCanvas(w, h);
  const rnd = mulberry32(hashSeed(p.id));

  switch (p.surface) {
    case "rocky-grey":
      ctx.fillStyle = "#8c8780"; ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, rnd, 900, ["#5f5b57", "#a8a39b", "#3f3c39"], w / 90);
      break;
    case "venus":
      ctx.fillStyle = "#d8b878"; ctx.fillRect(0, 0, w, h);
      bands(ctx, w, h, rnd, ["#e6cf9a", "#c9a56a", "#dcc08a"], 18);
      break;
    case "earth":
      ctx.fillStyle = "#1c4f8f"; ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, rnd, 400, ["#2a6bb5", "#143c70"], w / 60);
      continents(ctx, w, h, rnd);
      break;
    case "mars":
      ctx.fillStyle = "#b5593a"; ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, rnd, 1100, ["#8a3f28", "#d4825a", "#6d3322"], w / 70);
      ctx.fillStyle = "rgba(240,240,245,0.85)"; ctx.fillRect(0, 0, w, h * 0.04); ctx.fillRect(0, h * 0.96, w, h * 0.04);
      break;
    case "jupiter":
      ctx.fillStyle = "#c9a57a"; ctx.fillRect(0, 0, w, h);
      bands(ctx, w, h, rnd, ["#e8d3b0", "#b3835a", "#d9b98f", "#8f5f43", "#f0e2c8"], 26);
      ctx.fillStyle = "#b5472f"; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.ellipse(w * 0.62, h * 0.64, w * 0.04, h * 0.045, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case "saturn":
      ctx.fillStyle = "#d9c08a"; ctx.fillRect(0, 0, w, h);
      bands(ctx, w, h, rnd, ["#ead9a8", "#c9b17a", "#e0cb98"], 22);
      break;
    case "ice-cyan":
      ctx.fillStyle = "#8fd6d9"; ctx.fillRect(0, 0, w, h);
      bands(ctx, w, h, rnd, ["#9fe0e2", "#82ccd0", "#a8e6e8"], 8);
      break;
    case "ice-blue":
      ctx.fillStyle = "#3f62d8"; ctx.fillRect(0, 0, w, h);
      bands(ctx, w, h, rnd, ["#4a70e6", "#3552bd", "#5a82f0"], 12);
      ctx.fillStyle = "#26398a"; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(w * 0.3, h * 0.55, w * 0.035, h * 0.04, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      break;
  }
  return canvas;
}

export function createSurfaceTexture(p: Pick<PlanetData, "id" | "surface">, width: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(createSurfaceCanvas(p, width));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function createSunTexture(width: number): THREE.CanvasTexture {
  const w = width;
  const h = width / 2;
  const [canvas, ctx] = makeCanvas(w, h);
  const rnd = mulberry32(7);
  ctx.fillStyle = "#ffb52e"; ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, rnd, 1800, ["#ffd36a", "#ff9a1f", "#ffe9a3", "#e8780f"], w / 40);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Radial ring texture: alpha varies with distance so ring gaps read correctly. */
export function createRingTexture(color: string, seed: number): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size, 4);
  const rnd = mulberry32(seed);
  const img = ctx.createImageData(size, 4);
  const base = new THREE.Color(color);
  for (let x = 0; x < size; x++) {
    const band = 0.45 + 0.4 * Math.sin(x * 0.19) * Math.sin(x * 0.053 + 1) + (rnd() - 0.5) * 0.25;
    const gap = x > size * 0.58 && x < size * 0.63 ? 0.05 : 1;
    const a = Math.max(0, Math.min(1, band)) * gap;
    for (let y = 0; y < 4; y++) {
      const i = (y * size + x) * 4;
      img.data[i] = base.r * 255; img.data[i + 1] = base.g * 255; img.data[i + 2] = base.b * 255;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
