"use client";
import { PLANETS } from "@/data/planets";

export function PlanetNav({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const items = [{ id: "sun", name: "Matahari" }, ...PLANETS.map((p) => ({ id: p.id, name: p.name }))];
  return (
    <nav className="obs-nav" aria-label="Pilih benda langit">
      {items.map((it) => (
        <button key={it.id} type="button" onClick={() => onSelect(it.id)} aria-pressed={selectedId === it.id}>{it.name}</button>
      ))}
    </nav>
  );
}
