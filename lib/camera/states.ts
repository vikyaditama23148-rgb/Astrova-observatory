export type CameraMode = "SOLAR_SYSTEM" | "PLANET_FOCUS" | "PLANET_ORBIT" | "FREE_SPACE" | "POV_PLANET";

export interface ViewState {
  mode: CameraMode;
  planetId: string | null; // PlanetId or "sun"
}

export const INITIAL_VIEW: ViewState = { mode: "SOLAR_SYSTEM", planetId: null };

export type ViewAction =
  | { type: "select"; planetId: string }
  | { type: "explore" }
  | { type: "pov"; planetId: string }
  | { type: "free" }
  | { type: "reset" };

/** Pure transition function so camera state logic is testable without WebGL. */
export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case "select":
      return { mode: "PLANET_FOCUS", planetId: action.planetId };
    case "explore":
      return state.planetId ? { mode: "PLANET_ORBIT", planetId: state.planetId } : state;
    case "pov":
      return { mode: "POV_PLANET", planetId: action.planetId };
    case "free":
      return { mode: "FREE_SPACE", planetId: null };
    case "reset":
      return INITIAL_VIEW;
  }
}

/** Camera distance relative to the focused body radius. */
export const FOCUS_DISTANCE_FACTOR: Record<CameraMode, number> = {
  SOLAR_SYSTEM: 0,
  PLANET_FOCUS: 6,
  PLANET_ORBIT: 3.2,
  FREE_SPACE: 0,
  POV_PLANET: 0,
};
