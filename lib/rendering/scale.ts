import type { PlanetData } from "@/types/planet";

/** Visualization scale: NOT physically to scale. Compressed so all bodies fit one screen. */
export const SUN_VISUAL_RADIUS = 5;

export function visualRadius(p: Pick<PlanetData, "radiusKm">): number {
  return 0.5 * Math.sqrt(p.radiusKm / 6371);
}

export function visualOrbitRadius(p: Pick<PlanetData, "semiMajorAxisAu">): number {
  return 9 + 8 * Math.sqrt(p.semiMajorAxisAu);
}
