"use client";
import { useState } from "react";
import { PLANET_BY_ID, SUN, isPlanetId } from "@/data/planets";
import type { CameraMode } from "@/lib/camera/states";

function fmtDuration(hours: number): string {
  if (hours < 48) return `≈ ${hours.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jam`;
  return `≈ ${(hours / 24).toLocaleString("id-ID", { maximumFractionDigits: 1 })} hari`;
}
function fmtDays(days: number): string {
  if (days > 700) return `≈ ${(days / 365.256).toLocaleString("id-ID", { maximumFractionDigits: 1 })} tahun`;
  return `≈ ${days.toLocaleString("id-ID", { maximumFractionDigits: 0 })} hari`;
}


const CARD_CSS = `
.obs-card { transition: transform 0.3s ease; will-change: transform; }
.obs-card.is-collapsed { transform: translateX(calc(-100% - 24px)); pointer-events: none; }
.obs-card-tab {
  position: absolute; z-index: 5; bottom: 120px; left: calc(min(340px, 100% - 36px) + 18px);
  min-width: 44px; min-height: 44px; padding: 0 12px;
  display: flex; align-items: center; gap: 6px;
  background: var(--panel); border: 1px solid var(--line); border-left: 0;
  border-radius: 0 10px 10px 0; cursor: pointer; font-size: 0.8rem; color: var(--text);
  backdrop-filter: blur(6px); transition: left 0.3s ease;
}
.obs-card-tab.is-collapsed { left: 0; }
@media (max-width: 640px) {
  .obs-card-tab { bottom: 150px; }
}
`;

interface Props {
  id: string;
  mode: CameraMode;
  onExplore: () => void;
  onPov: () => void;
  onBack: () => void;
  rotationEnabled: boolean;
  onToggleRotation: () => void;
}

export function InfoCard({ id, mode, onExplore, onPov, onBack, rotationEnabled, onToggleRotation }: Props) {
  const planet = isPlanetId(id) ? PLANET_BY_ID[id] : null;
  // On phones the panel starts collapsed so it never hides the planet that was just tapped.
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  const name = planet?.name ?? SUN.name;
  const explored = mode === "PLANET_ORBIT";
  const pov = mode === "POV_PLANET";

  return (
    <>
    <style>{CARD_CSS}</style>
    <button
      type="button"
      className={`obs-card-tab${collapsed ? " is-collapsed" : ""}`}
      onClick={() => setCollapsed((v) => !v)}
      aria-expanded={!collapsed}
      aria-controls="obs-info-card"
      aria-label={collapsed ? `Buka informasi ${name}` : `Tutup informasi ${name}`}
    >
      <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
      <span>{collapsed ? "Info" : "Tutup"}</span>
    </button>
    <section id="obs-info-card" className={`obs-card${collapsed ? " is-collapsed" : ""}`} inert={collapsed} aria-live="polite" aria-label={`Informasi ${name}`}>
      <p className="obs-eyebrow">{planet ? `Planet ${planet.kind}` : "Bintang"}</p>
      <h2>{planet?.name ?? SUN.name}</h2>
      {planet ? (
        <dl className="obs-stats">
          <div><dt>Jarak dari Matahari</dt><dd>{planet.semiMajorAxisAu.toLocaleString("id-ID")} AU</dd></div>
          <div><dt>Rotasi</dt><dd>{fmtDuration(planet.rotationPeriodHours)}</dd></div>
          <div><dt>Revolusi</dt><dd>{fmtDays(planet.revolutionPeriodDays)}</dd></div>
          <div><dt>Kemiringan sumbu</dt><dd>{planet.axialTiltDeg.toLocaleString("id-ID")}°</dd></div>
          <div><dt>Bulan</dt><dd>{planet.moonCount}</dd></div>
        </dl>
      ) : null}
      <ul className="obs-facts">
        {(planet?.facts ?? SUN.facts).slice(0, explored ? 3 : 2).map((f) => <li key={f}>{f}</li>)}
      </ul>
      {pov && planet && (
        <p className="obs-note">
          POV: {planet.name.toUpperCase()} — sudut pandang ruang angkasa di samping planet, bukan posisi di permukaannya.
          Sumbu miring {planet.axialTiltDeg.toLocaleString("id-ID")}° terhadap bidang orbit.
        </p>
      )}
      {explored && planet && planet.pois.length > 0 && (
        <ul className="obs-pois">
          {planet.pois.map((p) => <li key={p.id}><strong>{p.label}.</strong> {p.text}</li>)}
        </ul>
      )}
      <div className="obs-actions">
        {!explored && <button type="button" onClick={onExplore}>Jelajahi</button>}
        {planet && !pov && <button type="button" onClick={onPov}>Tampilan POV</button>}
        {planet && <button type="button" onClick={onToggleRotation} aria-pressed={!rotationEnabled}>{rotationEnabled ? "Jeda rotasi" : "Lanjutkan rotasi"}</button>}
        <button type="button" onClick={onBack}>Kembali ke Tata Surya</button>
      </div>
    </section>
    </>
  );
}