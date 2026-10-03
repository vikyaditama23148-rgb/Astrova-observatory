"use client";
import { createContext, useContext, type MutableRefObject } from "react";
import type * as THREE from "three";
import type { QualitySettings } from "@/lib/performance/quality";
import type { SpeedMultiplier } from "@/lib/simulation/clock";
import type { ViewState } from "@/lib/camera/states";

export interface SimState {
  /** Simulated hours elapsed (drives orbits). */
  hours: number;
  /** Rotation clock; frozen independently when rotation is paused. */
  rotHours: number;
  speed: SpeedMultiplier;
  rotationEnabled: boolean;
}

export interface Layers {
  orbits: boolean;
  asteroids: boolean;
  comets: boolean;
  meteoroids: boolean;
  kuiper: boolean;
  oort: boolean;
  dust: boolean;
  wind: boolean;
}

export const DEFAULT_LAYERS: Layers = { orbits: true, asteroids: true, comets: true, meteoroids: true, kuiper: true, oort: true, dust: true, wind: true };

export interface ObservatoryScene {
  layers: Layers;
  sim: MutableRefObject<SimState>;
  bodies: MutableRefObject<Map<string, THREE.Object3D>>;
  quality: QualitySettings;
  view: ViewState;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onTextureUpgraded: () => void;
}

const Ctx = createContext<ObservatoryScene | null>(null);
export const SceneProvider = Ctx.Provider;

export function useScene(): ObservatoryScene {
  const v = useContext(Ctx);
  if (!v) throw new Error("useScene must be used inside <SceneProvider>");
  return v;
}