"use client";
import { useState } from "react";
import { PLANET_BY_ID, SUN, isPlanetId } from "@/data/planets";

const CARD_CSS = `
.obs-card-wrap {
  position: absolute; left: 0; right: 0; top: 84px; bottom: 170px; z-index: 4;
  display: flex; align-items: center; justify-content: center; padding: 0 18px;
  pointer-events: none;
}
.obs-card-wrap .obs-card {
  position: relative; left: auto; bottom: auto; pointer-events: auto;
  width: min(380px, 100%); max-height: 100%;
  transition: transform 0.3s ease, opacity 0.3s ease; will-change: transform;
}
.obs-card-wrap .obs-card.is-collapsed { transform: translateX(-110vw); opacity: 0; pointer-events: none; }
.obs-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.obs-card-close {
  flex: none; min-width: 44px; min-height: 44px; margin: -6px -8px 0 0; padding: 0 12px;
  background: transparent; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; font-size: 0.8rem; color: var(--text);
}
.obs-card-tab {
  position: absolute; z-index: 5; top: 50%; left: 0; transform: translateY(-50%);
  min-width: 44px; min-height: 52px; padding: 0 12px; display: flex; align-items: center; gap: 6px;
  background: var(--panel); border: 1px solid var(--line); border-left: 0; border-radius: 0 10px 10px 0;
  cursor: pointer; font-size: 0.8rem; color: var(--text); backdrop-filter: blur(6px);
}
@media (max-width: 640px) {
  .obs-card-wrap { top: 104px; bottom: 200px; }
}
`;

function fmtDuration(hours: number): string {
  if (hours < 48) return `≈ ${hours.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jam`;
  return `≈ ${(hours / 24).toLocaleString("id-ID", { maximumFractionDigits: 1 })} hari`;
}
function fmtDays(days: number): string {
  if (days > 700) return `≈ ${(days / 365.256).toLocaleString("id-ID", { maximumFractionDigits: 1 })} tahun`;
  return `≈ ${days.toLocaleString("id-ID", { maximumFractionDigits: 0 })} hari`;
}

interface Props {
  id: string;
  onBack: () => void;
  rotationEnabled: boolean;
  onToggleRotation: () => void;
}

export function InfoCard({ id, onBack, rotationEnabled, onToggleRotation }: Props) {
  const planet = isPlanetId(id) ? PLANET_BY_ID[id] : null;
  // On phones the panel starts collapsed so it never hides the planet that was just tapped.
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  const name = planet?.name ?? SUN.name;

  return (
    <>
      <style>{CARD_CSS}</style>
      {collapsed && (
        <button
          type="button"
          className="obs-card-tab"
          onClick={() => setCollapsed(false)}
          aria-expanded={false}
          aria-controls="obs-info-card"
          aria-label={`Buka informasi ${name}`}
        >
          <span aria-hidden="true">›</span>
          <span>Info</span>
        </button>
      )}
      <div className="obs-card-wrap">
        <section id="obs-info-card" className={`obs-card${collapsed ? " is-collapsed" : ""}`} inert={collapsed} aria-live="polite" aria-label={`Informasi ${name}`}>
          <div className="obs-card-head">
            <div>
              <p className="obs-eyebrow">{planet ? `Planet ${planet.kind}` : "Bintang"}</p>
              <h2>{name}</h2>
            </div>
            <button type="button" className="obs-card-close" onClick={() => setCollapsed(true)} aria-label={`Tutup informasi ${name}`}>Tutup ‹</button>
          </div>

          {planet && (
            <dl className="obs-stats">
              <div><dt>Jarak dari Matahari</dt><dd>{planet.semiMajorAxisAu.toLocaleString("id-ID")} AU</dd></div>
              <div><dt>Jari-jari</dt><dd>{planet.radiusKm.toLocaleString("id-ID")} km</dd></div>
              <div><dt>Rotasi</dt><dd>{fmtDuration(planet.rotationPeriodHours)}</dd></div>
              <div><dt>Revolusi</dt><dd>{fmtDays(planet.revolutionPeriodDays)}</dd></div>
              <div><dt>Kemiringan sumbu</dt><dd>{planet.axialTiltDeg.toLocaleString("id-ID")}°</dd></div>
              <div><dt>Bulan</dt><dd>{planet.moonCount}</dd></div>
            </dl>
          )}

          <ul className="obs-facts">
            {(planet?.facts ?? SUN.facts).map((f) => <li key={f}>{f}</li>)}
          </ul>

          {planet && planet.pois.length > 0 && (
            <ul className="obs-pois">
              {planet.pois.map((p) => <li key={p.id}><strong>{p.label}.</strong> {p.text}</li>)}
            </ul>
          )}

          <div className="obs-actions">
            {planet && (
              <button type="button" onClick={onToggleRotation} aria-pressed={!rotationEnabled}>
                {rotationEnabled ? "Jeda rotasi" : "Lanjutkan rotasi"}
              </button>
            )}
            <button type="button" onClick={onBack}>Kembali ke Tata Surya</button>
          </div>
        </section>
      </div>
    </>
  );
}