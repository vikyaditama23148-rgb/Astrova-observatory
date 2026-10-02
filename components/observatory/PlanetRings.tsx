"use client";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { createRingTexture } from "@/lib/rendering/textures";

const REAL_SATURN_RING_URL = "/textures/saturn_ring.png";

const VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWP;
varying vec3 vCenter;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; // ring is centred on the planet
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/** Sun is at the world origin. A fragment is in shadow if the ray toward the Sun passes through the planet sphere. */
const FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uPlanetRadius;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vWP;
varying vec3 vCenter;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  vec3 L = normalize(-vWP);
  vec3 w = vCenter - vWP;
  float t = dot(w, L);
  float d = length(w - t * L);
  float shadow = t > 0.0 ? 1.0 - smoothstep(uPlanetRadius * 0.9, uPlanetRadius * 1.05, d) : 1.0;
  float light = 0.12 + 0.95 * shadow;
  gl_FragColor = vec4(tex.rgb * light, tex.a * uOpacity);
  #include <colorspace_fragment>
}`;

function setUniform(material: THREE.ShaderMaterial, name: string, value: unknown) {
  material.uniforms[name].value = value;
}

/** Loads the real Saturn ring strip (left = inner edge, right = outer edge). Missing file -> null. */
function useRealRingTexture(enabled: boolean): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      REAL_SATURN_RING_URL,
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
  }, [enabled]);
  return enabled ? tex : null;
}

/** Flat ring with radial UVs so a 1-D strip texture maps from inner to outer edge. */
export function PlanetRings({ planetRadius, innerRatio, outerRatio, color, seed }: {
  planetRadius: number; innerRatio: number; outerRatio: number; color: string; seed: number;
}) {
  const inner = planetRadius * innerRatio;
  const outer = planetRadius * outerRatio;
  // Saturn is identified by its ring proportions (see data/planets.ts); only Saturn has a real texture.
  const isSaturn = Math.abs(innerRatio - 1.25) < 0.01 && Math.abs(outerRatio - 2.3) < 0.01;

  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(inner, outer, 160, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (r - inner) / (outer - inner), 0.5);
    }
    return g;
  }, [inner, outer]);

  const fallback = useMemo(() => createRingTexture(color, seed), [color, seed]);
  const real = useRealRingTexture(isSaturn);

  const material = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uMap: { value: fallback },
        uPlanetRadius: { value: planetRadius },
        uOpacity: { value: 0.92 },
      },
    }),
    // The map is swapped through the uniform below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planetRadius],
  );
  useEffect(() => { setUniform(material, "uMap", real ?? fallback); }, [material, real, fallback]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => fallback.dispose(), [fallback]);
  useEffect(() => () => material.dispose(), [material]);

  return <mesh geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} />;
}