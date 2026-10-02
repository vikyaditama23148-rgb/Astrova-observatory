import { describe, expect, it } from "vitest";
import { PLANETS, PLANET_BY_ID, isPlanetId } from "@/data/planets";
import { visualOrbitRadius, visualRadius, SUN_VISUAL_RADIUS } from "@/lib/rendering/scale";

describe("planet data integrity", () => {
  it("has the eight planets with unique ids", () => {
    expect(PLANETS).toHaveLength(8);
    expect(new Set(PLANETS.map((p) => p.id)).size).toBe(8);
  });
  it("has positive physical values and valid tilt", () => {
    for (const p of PLANETS) {
      expect(p.radiusKm).toBeGreaterThan(0);
      expect(p.semiMajorAxisAu).toBeGreaterThan(0);
      expect(p.rotationPeriodHours).toBeGreaterThan(0);
      expect(p.revolutionPeriodDays).toBeGreaterThan(0);
      expect(p.axialTiltDeg).toBeGreaterThanOrEqual(0);
      expect(p.axialTiltDeg).toBeLessThanOrEqual(180);
      expect(p.facts.length).toBeGreaterThan(0);
    }
  });
  it("orders planets by distance from the Sun", () => {
    const au = PLANETS.map((p) => p.semiMajorAxisAu);
    expect([...au].sort((a, b) => a - b)).toEqual(au);
  });
  it("matches known reference values", () => {
    expect(PLANET_BY_ID.earth.axialTiltDeg).toBeCloseTo(23.44, 2);
    expect(PLANET_BY_ID.uranus.axialTiltDeg).toBeGreaterThan(90);
    expect(PLANET_BY_ID.venus.axialTiltDeg).toBeGreaterThan(90);
    expect(PLANET_BY_ID.mercury.moonCount + PLANET_BY_ID.venus.moonCount).toBe(0);
  });
  it("gives rings only to Saturn and Uranus here", () => {
    expect(PLANETS.filter((p) => p.rings).map((p) => p.id)).toEqual(["saturn", "uranus"]);
  });
  it("isPlanetId rejects unknown values", () => {
    expect(isPlanetId("earth")).toBe(true);
    expect(isPlanetId("pluto")).toBe(false);
    expect(isPlanetId(null)).toBe(false);
  });
});

describe("visualization scale", () => {
  it("keeps orbits ordered and outside the Sun", () => {
    const orbits = PLANETS.map(visualOrbitRadius);
    expect([...orbits].sort((a, b) => a - b)).toEqual(orbits);
    expect(orbits[0]).toBeGreaterThan(SUN_VISUAL_RADIUS * 2);
  });
  it("keeps Jupiter larger than Earth but compressed", () => {
    const ratio = visualRadius(PLANET_BY_ID.jupiter) / visualRadius(PLANET_BY_ID.earth);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(PLANET_BY_ID.jupiter.radiusKm / PLANET_BY_ID.earth.radiusKm);
  });
  it("leaves gaps between adjacent orbits larger than planet radii", () => {
    for (let i = 1; i < PLANETS.length; i++) {
      const gap = visualOrbitRadius(PLANETS[i]) - visualOrbitRadius(PLANETS[i - 1]);
      expect(gap).toBeGreaterThan(visualRadius(PLANETS[i]) + visualRadius(PLANETS[i - 1]) - 0.01);
    }
  });
});
