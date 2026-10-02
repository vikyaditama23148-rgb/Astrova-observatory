"use client";
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
  const explored = mode === "PLANET_ORBIT";
  const pov = mode === "POV_PLANET";

  return (
    <section className="obs-card" aria-live="polite" aria-label={`Informasi ${planet?.name ?? SUN.name}`}>
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
  );
}
