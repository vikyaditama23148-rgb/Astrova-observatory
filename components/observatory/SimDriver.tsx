"use client";
import { useFrame } from "@react-three/fiber";
import { tickClock } from "@/lib/simulation/clock";
import { useScene } from "./context";

/** Single place where the simulation clock advances (frame-rate independent). */
export function SimDriver() {
  const { sim } = useScene();
  useFrame((_, dt) => {
    tickClock(sim.current, dt);
  });
  return null;
}
