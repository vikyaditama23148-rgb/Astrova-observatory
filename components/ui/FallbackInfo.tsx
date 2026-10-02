import { PLANETS } from "@/data/planets";

/** Non-3D alternative: the educational content is never only reachable through the canvas. */
export function FallbackInfo({ reason }: { reason: string }) {
  return (
    <div className="obs-fallback" role="region" aria-label="Informasi planet tanpa 3D">
      <h2>Tampilan 3D tidak tersedia</h2>
      <p>{reason}</p>
      <p>Berikut ringkasan planet Tata Surya:</p>
      <ul>
        {PLANETS.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong> ({p.kind}) — {p.semiMajorAxisAu.toLocaleString("id-ID")} AU dari Matahari; {p.facts[0]}
          </li>
        ))}
      </ul>
    </div>
  );
}
