import { describe, expect, it } from "vitest";
import { PLANET_BY_ID } from "@/data/planets";
import { advanceSimHours, orbitAngle, orbitPosition, rotationAngle, tickClock, formatSimTime } from "@/lib/simulation/clock";

describe("simulation clock", () => {
  it("is frame-rate independent for equal total time", () => {
    let a = 0, b = 0;
    for (let i = 0; i < 60; i++) a = advanceSimHours(a, 1 / 60, 10);
    for (let i = 0; i < 30; i++) b = advanceSimHours(b, 1 / 30, 10);
    expect(a).toBeCloseTo(b, 6);
  });
  it("does not advance when paused", () => {
    expect(advanceSimHours(5, 0.016, 0)).toBe(5);
  });
  it("clamps very long frames", () => {
    expect(advanceSimHours(0, 30, 1)).toBeCloseTo(0.1, 6);
  });
  it("freezes rotation independently of orbit", () => {
    const c = { hours: 0, rotHours: 0, speed: 100 as const, rotationEnabled: false };
    tickClock(c, 0.05);
    expect(c.hours).toBeGreaterThan(0);
    expect(c.rotHours).toBe(0);
  });
});

describe("rotation and orbit angles", () => {
  it("Earth completes one rotation in its period", () => {
    const e = PLANET_BY_ID.earth;
    expect(rotationAngle(e.rotationPeriodHours, e)).toBeCloseTo(0, 6);
    expect(rotationAngle(e.rotationPeriodHours / 2, e)).toBeCloseTo(Math.PI, 6);
  });
  it("Earth returns to its start phase after one revolution", () => {
    const e = PLANET_BY_ID.earth;
    const full = e.revolutionPeriodDays * 24;
    expect(orbitAngle(full, e)).toBeCloseTo(e.startPhase % (Math.PI * 2), 6);
  });
  it("inner planets orbit faster than outer ones", () => {
    const t = 1000;
    const adv = (id: "mercury" | "neptune") => orbitAngle(t, PLANET_BY_ID[id]) - PLANET_BY_ID[id].startPhase;
    expect(adv("mercury")).toBeGreaterThan(adv("neptune"));
  });
  it("orbit position lies on the requested radius in the ecliptic plane", () => {
    const [x, y, z] = orbitPosition(1.234, 20);
    expect(y).toBe(0);
    expect(Math.hypot(x, z)).toBeCloseTo(20, 6);
  });
  it("formats simulated time", () => {
    expect(formatSimTime(48)).toBe("2 hr");
    expect(formatSimTime(24 * 400)).toMatch(/^1 th/);
  });
});
