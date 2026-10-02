"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { visualOrbitRadius } from "@/lib/rendering/scale";
import type { PlanetData } from "@/types/planet";

function OrbitLine({ data, highlighted }: { data: PlanetData; highlighted: boolean }) {
  const line = useMemo(() => {
    const r = visualOrbitRadius(data);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r));
    }
    const material = new THREE.LineBasicMaterial({
      color: highlighted ? "#7fd0ff" : "#4a5d78",
      transparent: true,
      opacity: highlighted ? 0.9 : 0.45,
    });
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material);
  }, [data, highlighted]);
  useEffect(() => () => {
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }, [line]);
  return <primitive object={line} raycast={() => null} />;
}

export function OrbitSystem({ planets, selectedId }: { planets: PlanetData[]; selectedId: string | null }) {
  return (
    <group>
      {planets.map((p) => <OrbitLine key={p.id} data={p} highlighted={p.id === selectedId} />)}
    </group>
  );
}
