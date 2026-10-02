import type { PlanetData } from "@/types/planet";

export const SPEEDS = [0, 1, 10, 100, 1000] as const;
export type SpeedMultiplier = (typeof SPEEDS)[number];

/** 1x = 1 simulated hour per real second. Frame-rate independent; tune here. */
export const SIM_HOURS_PER_SECOND = 1;

export function advanceSimHours(current: number, deltaSeconds: number, speed: SpeedMultiplier): number {
  const dt = Math.min(deltaSeconds, 0.1); // clamp long frames (tab switch)
  return current + dt * speed * SIM_HOURS_PER_SECOND;
}

const TWO_PI = Math.PI * 2;

export function rotationAngle(simHours: number, p: Pick<PlanetData, "rotationPeriodHours">): number {
  return ((simHours / p.rotationPeriodHours) * TWO_PI) % TWO_PI;
}

export function orbitAngle(simHours: number, p: Pick<PlanetData, "revolutionPeriodDays" | "startPhase">): number {
  return (p.startPhase + (simHours / (p.revolutionPeriodDays * 24)) * TWO_PI) % TWO_PI;
}

export function orbitPosition(angle: number, radius: number): [number, number, number] {
  return [Math.cos(angle) * radius, 0, -Math.sin(angle) * radius];
}

export function formatSimTime(simHours: number): string {
  const days = Math.floor(simHours / 24);
  const years = Math.floor(days / 365.256);
  const d = Math.floor(days - years * 365.256);
  return years > 0 ? `${years} th ${d} hr` : `${d} hr`;
}

export interface SimClock {
  hours: number;
  rotHours: number;
  speed: SpeedMultiplier;
  rotationEnabled: boolean;
}

/** Advances the shared clock in place. Rotation can be frozen independently of orbits. */
export function tickClock(clock: SimClock, deltaSeconds: number): void {
  clock.hours = advanceSimHours(clock.hours, deltaSeconds, clock.speed);
  if (clock.rotationEnabled) clock.rotHours = advanceSimHours(clock.rotHours, deltaSeconds, clock.speed);
}
