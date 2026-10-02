"use client";
import { useMemo, useEffect } from "react";
import * as THREE from "three";

export function Starfield({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    let s = 12345;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < count; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 600 + rnd() * 200;
      const k = Math.sqrt(1 - u * u);
      pos.set([r * k * Math.cos(th), r * u, r * k * Math.sin(th)], i * 3);
      const warm = rnd();
      const b = 0.5 + rnd() * 0.5;
      col.set([b * (0.8 + warm * 0.2), b * 0.9, b * (1.0 - warm * 0.25)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={1.6} sizeAttenuation={false} vertexColors transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}
