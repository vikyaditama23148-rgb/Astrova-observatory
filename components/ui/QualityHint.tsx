"use client";
import { useEffect } from "react";
import type { QualityLevel } from "@/lib/performance/quality";

const CSS = `
.obs-hint {
  position: absolute; z-index: 7; left: 50%; transform: translateX(-50%); top: 72px;
  width: min(440px, calc(100% - 36px)); padding: 12px 14px;
  background: var(--panel); border: 1px solid var(--accent); border-radius: 12px; backdrop-filter: blur(8px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
}
.obs-hint h2 { margin: 0 0 4px; font-size: 0.9rem; letter-spacing: 0.04em; }
.obs-hint p { margin: 0 0 10px; font-size: 0.8rem; line-height: 1.45; color: #cfd9ea; }
.obs-hint-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.obs-hint-actions button {
  min-height: 40px; padding: 0 12px; border-radius: 8px; cursor: pointer; font-size: 0.8rem;
  background: transparent; border: 1px solid var(--line); color: var(--text);
}
.obs-hint-actions button.is-primary { border-color: var(--accent); background: rgba(127, 208, 255, 0.16); }
@media (max-width: 640px) { .obs-hint { top: 128px; } }
`;

const AUTO_HIDE_MS = 18000;

const COPY: Record<"performance" | "balanced", { title: string; body: string }> = {
  performance: {
    title: "Grafik bisa ditingkatkan",
    body: "Saat ini memakai kualitas Performa supaya lancar di perangkat Anda. Lewat menu Kualitas di bagian atas layar, Anda bisa menaikkannya ke Seimbang atau lebih tinggi untuk atmosfer planet, korona Matahari, dan lidah api. Perangkat yang lemah bisa menjadi berat.",
  },
  balanced: {
    title: "Ada grafik yang lebih tajam",
    body: "Saat ini memakai kualitas Seimbang. Pilihan Tinggi atau Ultra di menu Kualitas (bagian atas layar) memberi tekstur lebih tajam serta lebih banyak bintang dan partikel, tetapi butuh perangkat yang kuat.",
  },
};

interface Props {
  level: QualityLevel;
  onOpenMenu: () => void;
  onDismiss: () => void;
  onAutoHide: () => void;
}

export function QualityHint({ level, onOpenMenu, onDismiss, onAutoHide }: Props) {
  useEffect(() => {
    const id = window.setTimeout(onAutoHide, AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [onAutoHide]);

  const copy = level === "performance" ? COPY.performance : COPY.balanced;
  return (
    <>
      <style>{CSS}</style>
      <aside className="obs-hint" role="status" aria-live="polite">
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <div className="obs-hint-actions">
          <button type="button" className="is-primary" onClick={onOpenMenu}>Buka menu Kualitas</button>
          <button type="button" onClick={onDismiss}>Mengerti</button>
        </div>
      </aside>
    </>
  );
}