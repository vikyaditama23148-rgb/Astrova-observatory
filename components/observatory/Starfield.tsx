"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SKY_URL = "/textures/stars_milky_way.jpg";
const SKY_RADIUS = 900;

/** Loads public/textures/stars_milky_way.jpg (equirectangular). Missing file -> null, point stars only. */
function useSkyTexture(): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      SKY_URL,
      (t) => {
        if (cancelled) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 2;
        loaded = t;
        setTex(t);
      },
      undefined,
      () => { /* missing file: keep procedural point stars */ },
    );
    return () => { cancelled = true; loaded?.dispose(); };
  }, []);
  return tex;
}

export function Starfield({ count }: { count: number }) {
  const sky = useSkyTexture();
  const skyRef = useRef<THREE.Mesh>(null);

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

  // Keep the sky dome centred on the camera so it never shows parallax or an edge.
  useFrame(({ camera }) => { skyRef.current?.position.copy(camera.position); });

  return (
    <>
      {sky && (
        <mesh ref={skyRef} scale={[-1, 1, 1]} renderOrder={-10} frustumCulled={false} raycast={() => null}>
          <sphereGeometry args={[SKY_RADIUS, 64, 32]} />
          <meshBasicMaterial map={sky} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={1.6} sizeAttenuation={false} vertexColors transparent opacity={sky ? 0.45 : 0.85} depthWrite={false} />
      </points>
    </>
  );
}