"use client";
import type { QualityChoice, QualityLevel } from "@/lib/performance/quality";

const OPTIONS: { value: QualityChoice; label: string }[] = [
  { value: "auto", label: "Otomatis" },
  { value: "performance", label: "Performa" },
  { value: "balanced", label: "Seimbang" },
  { value: "high", label: "Tinggi" },
  { value: "ultra", label: "Ultra" },
];

export function QualityMenu({ choice, resolved, onChange }: { choice: QualityChoice; resolved: QualityLevel; onChange: (c: QualityChoice) => void }) {
  return (
    <label className="obs-quality">
      <span>Kualitas{choice === "auto" ? ` (${OPTIONS.find((o) => o.value === resolved)?.label})` : ""}</span>
      <select value={choice} onChange={(e) => onChange(e.target.value as QualityChoice)}>
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
