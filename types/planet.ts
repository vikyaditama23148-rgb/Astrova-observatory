export type PlanetId =
  | "mercury" | "venus" | "earth" | "mars"
  | "jupiter" | "saturn" | "uranus" | "neptune";

export type PlanetKind = "terestrial" | "raksasa gas" | "raksasa es";

export type PoiId = string;

export interface PlanetPoi {
  id: PoiId;
  label: string;
  text: string;
}

export interface PlanetData {
  id: PlanetId;
  name: string;
  kind: PlanetKind;
  /** Mean radius in km (NASA planetary fact sheet). */
  radiusKm: number;
  /** Semi-major axis in AU. */
  semiMajorAxisAu: number;
  /** Sidereal rotation period in hours (always positive; direction is encoded by axialTiltDeg > 90). */
  rotationPeriodHours: number;
  /** Sidereal orbital period in Earth days. */
  revolutionPeriodDays: number;
  /** Obliquity to orbit in degrees. */
  axialTiltDeg: number;
  /** Starting orbital phase in radians (arbitrary, for visual variety). */
  startPhase: number;
  /** Known moons (Sky & Telescope, Nov 2025). Changes as discoveries are confirmed. */
  moonCount: number;
  atmosphere?: { color: string; intensity: number };
  rings?: { innerRatio: number; outerRatio: number; color: string };
  /** Procedural surface style key resolved in lib/rendering/textures.ts */
  surface: "rocky-grey" | "venus" | "earth" | "mars" | "jupiter" | "saturn" | "ice-cyan" | "ice-blue";
  facts: string[];
  pois: PlanetPoi[];
}
