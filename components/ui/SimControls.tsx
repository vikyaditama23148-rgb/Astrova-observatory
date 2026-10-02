"use client";
import { SPEEDS, type SpeedMultiplier } from "@/lib/simulation/clock";

export function SimControls({ speed, onSpeed, timeLabelId }: { speed: SpeedMultiplier; onSpeed: (s: SpeedMultiplier) => void; timeLabelId: string }) {
  return (
    <div className="obs-sim" role="group" aria-label="Kontrol waktu simulasi">
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSpeed(s)}
          aria-pressed={speed === s}
          aria-label={s === 0 ? "Jeda simulasi" : `Kecepatan ${s} kali`}
        >
          {s === 0 ? "⏸" : `${s}×`}
        </button>
      ))}
      <span className="obs-time" id={timeLabelId} aria-live="off">0 hr</span>
    </div>
  );
}
