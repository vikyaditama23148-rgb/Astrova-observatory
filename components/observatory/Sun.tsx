"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SUN_VISUAL_RADIUS } from "@/lib/rendering/scale";
import { createSunTexture } from "@/lib/rendering/textures";
import { useScene } from "./context";

function coronaTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  g.addColorStop(0, "rgba(255,200,90,0.85)");
  g.addColorStop(0.35, "rgba(255,150,40,0.28)");
  g.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const REAL_SUN_URL = "/textures/sun.jpg";

/** Loads public/textures/sun.jpg. If the file is missing, the procedural texture stays. */
function useRealSunTexture(): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      REAL_SUN_URL,
      (t) => {
        if (cancelled) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        loaded = t;
        setTex(t);
      },
      undefined,
      () => { /* missing file: keep procedural fallback */ },
    );
    return () => { cancelled = true; loaded?.dispose(); };
  }, []);
  return tex;
}

export function Sun() {
  const { quality, bodies, onSelect } = useScene();
  const mesh = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const fallback = useMemo(() => createSunTexture(Math.min(quality.textureSize, 2048)), [quality.textureSize]);
  const realTex = useRealSunTexture();
  const tex = realTex ?? fallback;
  const corona = useMemo(() => (quality.corona ? coronaTexture() : null), [quality.corona]);

  useEffect(() => () => fallback.dispose(), [fallback]);
  useEffect(() => () => corona?.dispose(), [corona]);
  useEffect(() => {
    const map = bodies.current;
    if (group.current) map.set("sun", group.current);
    return () => { map.delete("sun"); };
  }, [bodies]);
  useFrame((_, dt) => { if (mesh.current) mesh.current.rotation.y += dt * 0.02; });

  return (
    <group ref={group}>
      <pointLight intensity={9} decay={0} distance={0} color="#fff3e0" />
      <mesh ref={mesh} onClick={(e) => { e.stopPropagation(); onSelect("sun"); }}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS, quality.sphereSegments, quality.sphereSegments / 2]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {corona && (
        <sprite scale={[SUN_VISUAL_RADIUS * 4.2, SUN_VISUAL_RADIUS * 4.2, 1]} raycast={() => null}>
          <spriteMaterial map={corona} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}