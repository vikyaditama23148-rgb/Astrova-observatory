"use client";
import type { QualityChoice, QualityLevel } from "@/lib/performance/quality";

const OPTIONS: { value: QualityChoice; label: string }[] = [
  { value: "auto", label: "Otomatis" },
  { value: "performance", label: "Performa" },
  { value: "balanced", label: "Seimbang" },
  { value: "high", label: "Tinggi" },
  { value: "ultra", label: "Ultra" },
];

const PULSE_CSS = `
@keyframes obsPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(127, 208, 255, 0); } 50% { box-shadow: 0 0 0 6px rgba(127, 208, 255, 0.6); } }
.obs-quality select.obs-pulse { animation: obsPulse 1s ease-in-out 3; border-color: var(--accent); }
`;

export function QualityMenu({ choice, resolved, onChange }: { choice: QualityChoice; resolved: QualityLevel; onChange: (c: QualityChoice) => void }) {
  return (
    <>
    <style>{PULSE_CSS}</style>
    <label
      className="obs-quality"
      style={{ whiteSpace: "nowrap", flex: "none" }}
      title={`Kualitas aktif: ${OPTIONS.find((o) => o.value === resolved)?.label}`}
    >
      <span>Kualitas</span>
      {/* Fixed width: changing the mode must not resize this control and shift the neighbouring button. */}
      <select id="obs-quality-select" style={{ width: 112 }} value={choice} onChange={(e) => onChange(e.target.value as QualityChoice)}>
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
    </>
  );
}