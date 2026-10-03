"use client";
import type { Layers } from "@/components/observatory/context";

const ITEMS: { key: keyof Layers; label: string }[] = [
  { key: "orbits", label: "Garis orbit" },
  { key: "asteroids", label: "Sabuk asteroid" },
  { key: "comets", label: "Komet" },
  { key: "meteoroids", label: "Meteoroid" },
  { key: "kuiper", label: "Sabuk Kuiper" },
  { key: "oort", label: "Awan Oort" },
  { key: "dust", label: "Debu antarplanet" },
  { key: "wind", label: "Angin surya & heliosfer" },
];

const CSS = `
.obs-layers { position: absolute; z-index: 3; right: 18px; top: 50%; transform: translateY(-50%); }
.obs-layers summary {
  list-style: none; cursor: pointer; min-height: 44px; padding: 0 14px; display: flex; align-items: center;
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px; font-size: 0.8rem; backdrop-filter: blur(6px);
}
.obs-layers summary::-webkit-details-marker { display: none; }
.obs-layers[open] summary { border-color: var(--accent); }
.obs-layers-list {
  position: absolute; right: 0; top: calc(100% + 6px); min-width: 210px; padding: 6px 4px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px; backdrop-filter: blur(6px);
}
.obs-layer-item { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 10px; font-size: 0.82rem; cursor: pointer; white-space: nowrap; }
.obs-layer-item input { width: 18px; height: 18px; accent-color: var(--accent); }
`;

export function LayerMenu({ layers, onToggle }: { layers: Layers; onToggle: (key: keyof Layers) => void }) {
  return (
    <>
      <style>{CSS}</style>
      <details className="obs-layers">
        <summary>Lapisan</summary>
        <div className="obs-layers-list" role="group" aria-label="Lapisan objek">
          {ITEMS.map((it) => (
            <label key={it.key} className="obs-layer-item">
              <input type="checkbox" checked={layers[it.key]} onChange={() => onToggle(it.key)} />
              {it.label}
            </label>
          ))}
        </div>
      </details>
    </>
  );
}