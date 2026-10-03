import { describe, expect, it } from "vitest";
import { COMETS, cometVisualPosition, eclipticPositionAu, periodDays, solveKepler, toVisual } from "@/lib/simulation/kepler";
import { visualOrbitRadius } from "@/lib/rendering/scale";

describe("Kepler solver", () => {
  it("satisfies Kepler's equation for low and extreme eccentricities", () => {
    for (const e of [0, 0.3, 0.8, 0.9671, 0.9951]) {
      for (const M of [0.01, 0.5, 1.9, 3.14, 5.2, 6.2]) {
        const E = solveKepler(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
      }
    }
  });
});

describe("orbit geometry", () => {
  it("places perihelion at a(1-e) and aphelion at a(1+e)", () => {
    for (const c of COMETS) {
      const peri = Math.hypot(...eclipticPositionAu(c.el, 0));
      const aph = Math.hypot(...eclipticPositionAu(c.el, Math.PI));
      expect(peri).toBeCloseTo(c.el.a * (1 - c.el.e), 6);
      expect(aph).toBeCloseTo(c.el.a * (1 + c.el.e), 6);
    }
  });
  it("gives Halley a period near 75 years and Encke near 3.3 years", () => {
    const halley = COMETS.find((c) => c.id === "halley")!;
    const encke = COMETS.find((c) => c.id === "encke")!;
    expect(periodDays(halley.el.a) / 365.256).toBeGreaterThan(74);
    expect(periodDays(halley.el.a) / 365.256).toBeLessThan(77);
    expect(periodDays(encke.el.a) / 365.256).toBeGreaterThan(3.2);
    expect(periodDays(encke.el.a) / 365.256).toBeLessThan(3.4);
  });
  it("keeps an equatorial orbit in the ecliptic plane", () => {
    const [, , z] = eclipticPositionAu({ a: 2, e: 0.2, inc: 0, node: 0, peri: 40 }, 1.1);
    expect(z).toBeCloseTo(0, 12);
  });
  it("compresses distance with the planets' visual law", () => {
    const v = toVisual([3, 4, 0]); // 5 AU
    expect(Math.hypot(...v.pos)).toBeCloseTo(visualOrbitRadius({ semiMajorAxisAu: 5 }), 6);
    expect(v.rAu).toBeCloseTo(5, 9);
  });
  it("is periodic in simulated time", () => {
    const c = COMETS.find((x) => x.id === "encke")!;
    const T = periodDays(c.el.a) * 24;
    const a = cometVisualPosition(c, 100).pos;
    const b = cometVisualPosition(c, 100 + T).pos;
    for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], 5);
  });
});