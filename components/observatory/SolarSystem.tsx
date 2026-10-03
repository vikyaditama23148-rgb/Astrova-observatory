"use client";
import { PLANETS } from "@/data/planets";
import { OrbitSystem } from "./OrbitSystem";
import { Planet } from "./Planet";
import { Starfield } from "./Starfield";
import { Sun } from "./Sun";
import { AsteroidBelt } from "./AsteroidBelt";
import { Comets, InterplanetaryDust, KuiperBelt, Meteoroids, OortCloud, SolarWind } from "./SmallBodies";
import { CameraController } from "./CameraController";
import { SimDriver } from "./SimDriver";
import { useScene } from "./context";

export function SolarSystem() {
  const { quality, view, layers } = useScene();
  return (
    <>
      <color attach="background" args={["#02030a"]} />
      <SimDriver />
      <ambientLight intensity={0.25} />
      <Starfield count={quality.starCount} />
      <Sun />
      <OrbitSystem planets={PLANETS} selectedId={view.planetId} />
      {layers.asteroids && <AsteroidBelt />}
      {layers.dust && <InterplanetaryDust />}
      {layers.kuiper && <KuiperBelt />}
      {layers.oort && <OortCloud />}
      {layers.comets && <Comets />}
      {layers.meteoroids && <Meteoroids />}
      {layers.wind && <SolarWind />}
      {PLANETS.map((p, i) => <Planet key={p.id} data={p} index={i} />)}
      <CameraController />
    </>
  );
}