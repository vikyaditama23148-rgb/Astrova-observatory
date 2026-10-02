"use client";
import { PLANETS } from "@/data/planets";
import { OrbitSystem } from "./OrbitSystem";
import { Planet } from "./Planet";
import { Starfield } from "./Starfield";
import { Sun } from "./Sun";
import { AsteroidBelt } from "./AsteroidBelt";
import { CameraController } from "./CameraController";
import { SimDriver } from "./SimDriver";
import { useScene } from "./context";

export function SolarSystem() {
  const { quality, view } = useScene();
  return (
    <>
      <color attach="background" args={["#02030a"]} />
      <SimDriver />
      <ambientLight intensity={0.25} />
      <Starfield count={quality.starCount} />
      <Sun />
      <OrbitSystem planets={PLANETS} selectedId={view.planetId} />
      <AsteroidBelt />
      {PLANETS.map((p, i) => <Planet key={p.id} data={p} index={i} />)}
      <CameraController />
    </>
  );
}