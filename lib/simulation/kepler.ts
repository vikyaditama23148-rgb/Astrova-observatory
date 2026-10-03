import { visualOrbitRadius } from "@/lib/rendering/scale";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Classical orbital elements. Angles in degrees, a in AU. */
export interface OrbitElements {
  a: number;
  e: number;
  inc: number;
  node: number; // longitude of ascending node
  peri: number; // argument of perihelion
}

/** Solves Kepler's equation M = E - e sin E (Newton's method; robust up to e ~ 0.999). */
export function solveKepler(M: number, e: number): number {
  const m = ((M % TAU) + TAU) % TAU;
  let E = e < 0.8 ? m : Math.PI;
  for (let i = 0; i < 60; i++) {
    const f = E - e * Math.sin(E) - m;
    const dE = f / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

export function periodDays(aAu: number): number {
  return 365.256 * Math.pow(aAu, 1.5); // Kepler's third law, a in AU
}

/** Heliocentric ecliptic position (AU) for eccentric anomaly E. */
export function eclipticPositionAu(el: OrbitElements, E: number): [number, number, number] {
  const xp = el.a * (Math.cos(E) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const w = el.peri * DEG, O = el.node * DEG, i = el.inc * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(i), si = Math.sin(i);
  const x = (cO * cw - sO * sw * ci) * xp + (-cO * sw - sO * cw * ci) * yp;
  const y = (sO * cw + cO * sw * ci) * xp + (-sO * sw + cO * cw * ci) * yp;
  const z = sw * si * xp + cw * si * yp;
  return [x, y, z];
}

/**
 * Ecliptic AU -> scene units. Scene axes match orbitPosition(): x = ecliptic x, y = ecliptic z (north), z = -ecliptic y.
 * The distance from the Sun is compressed with the same sqrt law as the planets, so ordering of orbits is preserved.
 */
export function toVisual(p: [number, number, number]): { pos: [number, number, number]; rAu: number } {
  const [x, y, z] = p;
  const rAu = Math.hypot(x, y, z);
  const k = rAu > 0 ? visualOrbitRadius({ semiMajorAxisAu: rAu }) / rAu : 0;
  return { pos: [x * k, z * k, -y * k], rAu };
}

export interface CometData {
  id: string;
  name: string;
  el: OrbitElements;
  /** Mean anomaly at simulation start (degrees). Starting phase is arbitrary, like the planets'. */
  m0: number;
}

/**
 * Approximate orbital elements of well-known comets, typed from memory of published values (JPL Small-Body Database).
 * Good enough for a schematic; verify against ssd.jpl.nasa.gov before citing precise numbers.
 */
export const COMETS: CometData[] = [
  { id: "halley", name: "Halley", el: { a: 17.834, e: 0.9671, inc: 162.26, node: 58.42, peri: 111.33 }, m0: 150 },
  { id: "encke", name: "Encke", el: { a: 2.215, e: 0.8483, inc: 11.78, node: 334.57, peri: 186.55 }, m0: 300 },
  { id: "67p", name: "67P/C-G", el: { a: 3.463, e: 0.6405, inc: 7.04, node: 50.15, peri: 12.78 }, m0: 220 },
  { id: "swift-tuttle", name: "Swift-Tuttle", el: { a: 26.09, e: 0.9632, inc: 113.45, node: 139.38, peri: 152.98 }, m0: 340 },
  { id: "hale-bopp", name: "Hale-Bopp", el: { a: 186, e: 0.9951, inc: 89.43, node: 282.47, peri: 130.59 }, m0: 359.6 },
];

/** Position of a comet at simulated `hours`, in scene units. */
export function cometVisualPosition(c: CometData, hours: number): { pos: [number, number, number]; rAu: number } {
  const M = c.m0 * DEG + (hours / (periodDays(c.el.a) * 24)) * TAU;
  return toVisual(eclipticPositionAu(c.el, solveKepler(M, c.el.e)));
}

/** Sampled orbit path in scene units (uniform in eccentric anomaly). */
export function cometOrbitPath(c: CometData, samples = 360): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i <= samples; i++) out.push(toVisual(eclipticPositionAu(c.el, (i / samples) * TAU)).pos);
  return out;
}