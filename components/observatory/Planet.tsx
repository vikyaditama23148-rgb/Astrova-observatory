"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PlanetData } from "@/types/planet";
import { visualOrbitRadius, visualRadius } from "@/lib/rendering/scale";
import { createSurfaceTexture } from "@/lib/rendering/textures";
import { orbitAngle, orbitPosition, rotationAngle } from "@/lib/simulation/clock";
import { Atmosphere } from "./Atmosphere";
import { PlanetRings } from "./PlanetRings";
import { useScene } from "./context";

const LOW_RES = 256;

/* ---------- Shaders: Sun is at the world origin, so light direction = -worldPosition ---------- */

const VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWN;
varying vec3 vWP;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const SURFACE_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uBump;
uniform float uAmbient;
uniform float uSpec;
uniform sampler2D uNight;
uniform float uNightAmt;
varying vec2 vUv;
varying vec3 vWN;
varying vec3 vWP;

void main() {
  vec3 col = texture2D(uMap, vUv).rgb;
  vec3 N0 = normalize(vWN);

  // Bump mapping from texture luminance (surface-gradient method, no tangents needed).
  float h = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 dpdx = dFdx(vWP);
  vec3 dpdy = dFdy(vWP);
  float dhx = dFdx(h);
  float dhy = dFdy(h);
  vec3 r1 = cross(dpdy, N0);
  vec3 r2 = cross(N0, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  vec3 N = normalize(abs(det) * N0 - uBump * grad);

  vec3 L = normalize(-vWP);
  vec3 V = normalize(cameraPosition - vWP);
  float ndl = dot(N, L);
  float lit = smoothstep(-0.04, 0.45, ndl);          // soft terminator
  float terminator = exp(-pow((ndl - 0.05) * 6.0, 2.0)); // warm glow band at day/night edge

  vec3 c = col * (uAmbient + lit * 1.15);
  c += vec3(0.9, 0.35, 0.12) * terminator * 0.05 * lit;

  // Ocean glint (Earth only): blue-dominant texels reflect the Sun.
  float ocean = step(col.r * 1.4, col.b);
  vec3 R = reflect(-L, N);
  c += vec3(1.0, 0.95, 0.85) * pow(max(dot(R, V), 0.0), 48.0) * uSpec * ocean * lit;

  // City lights on the dark side (Earth, when a night map is present).
  c += texture2D(uNight, vUv).rgb * (1.0 - smoothstep(-0.1, 0.2, ndl)) * uNightAmt;

  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const CLOUD_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uAmbient;
uniform float uLuma;
varying vec2 vUv;
varying vec3 vWN;
varying vec3 vWP;
void main() {
  vec4 t = texture2D(uMap, vUv);
  float a = mix(t.a, t.r, uLuma); // real cloud maps are grayscale; the procedural one uses alpha
  vec3 N = normalize(vWN);
  vec3 L = normalize(-vWP);
  float lit = smoothstep(-0.05, 0.4, dot(N, L));
  gl_FragColor = vec4(vec3(1.0) * (uAmbient + lit * 1.05), a * 0.8);
  #include <colorspace_fragment>
}`;

const BUMP_BY_SURFACE: Record<PlanetData["surface"], number> = {
  "rocky-grey": 0.06, venus: 0.004, earth: 0.02, mars: 0.05,
  jupiter: 0.003, saturn: 0.003, "ice-cyan": 0.002, "ice-blue": 0.002,
};

function makeSurfaceMaterial(map: THREE.Texture, radius: number, surface: PlanetData["surface"], isEarth: boolean) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
    uniforms: {
      uMap: { value: map },
      uBump: { value: BUMP_BY_SURFACE[surface] * radius },
      uAmbient: { value: 0.035 },
      uSpec: { value: isEarth ? 0.7 : 0 },
      uNight: { value: map },
      uNightAmt: { value: 0 },
    },
  });
}

function setUniform(material: THREE.ShaderMaterial, name: string, value: unknown) {
  material.uniforms[name].value = value;
}

/** Real photo-based textures live in /public/textures. If a file is missing, the procedural texture stays. */
const REAL_TEXTURE_DIR = "/textures";

type RealState = { url: string | null; tex: THREE.Texture | null; status: "loading" | "ready" | "failed" };

function useRealTexture(file: string | null): { tex: THREE.Texture | null; status: RealState["status"] } {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const url = file ? `${REAL_TEXTURE_DIR}/${file}` : null;
  const [state, setState] = useState<RealState>({ url: null, tex: null, status: "loading" });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (cancelled) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, maxAniso);
        t.wrapS = THREE.RepeatWrapping;
        loaded = t;
        setState({ url, tex: t, status: "ready" });
      },
      undefined,
      () => { if (!cancelled) setState({ url, tex: null, status: "failed" }); },
    );
    return () => { cancelled = true; loaded?.dispose(); };
  }, [url, maxAniso]);

  if (!url) return { tex: null, status: "failed" };
  if (state.url !== url) return { tex: null, status: "loading" };
  return { tex: state.tex, status: state.status };
}

function createCloudTexture(size: number): THREE.CanvasTexture {
  const w = size, h = size / 2;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  let s = 99;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 520; i++) {
    const cx = rnd() * w, cy = h * (0.08 + rnd() * 0.84);
    const rx = 10 + rnd() * (w / 16), ry = rx * (0.18 + rnd() * 0.28);
    ctx.fillStyle = `rgba(255,255,255,${0.1 + rnd() * 0.28})`;
    for (const dx of [-w, 0, w]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy, rx, ry, (rnd() - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function createLabelTexture(text: string, selected: boolean): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = selected ? "#7fd0ff" : "#e8eef8";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 6;
  ctx.fillText(text.toUpperCase(), 128, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- Staged texture loading ---------- */

function useStagedTexture(p: PlanetData, targetSize: number, priority: boolean, delayMs: number, enabled: boolean) {
  const { onTextureUpgraded } = useScene();
  const low = useMemo(() => createSurfaceTexture(p, LOW_RES), [p]);
  const [high, setHigh] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let created: THREE.CanvasTexture | null = null;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      created = createSurfaceTexture(p, targetSize);
      setHigh(created);
      onTextureUpgraded();
    }, priority ? 0 : delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
      created?.dispose();
    };
  }, [p, targetSize, priority, delayMs, enabled, onTextureUpgraded]);

  useEffect(() => () => low.dispose(), [low]);
  return enabled && high ? high : low;
}

/* ---------- Component ---------- */

export function Planet({ data, index }: { data: PlanetData; index: number }) {
  const { sim, bodies, quality, view, onSelect } = useScene();
  const selected = view.planetId === data.id;
  const isEarth = data.id === "earth";
  const radius = visualRadius(data);
  const orbitR = visualOrbitRadius(data);
  const seg = quality.sphereSegments;

  const orbitGroup = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);

  // Real textures (public/textures/*.jpg). Procedural ones remain as the fallback if a file is missing.
  const real = useRealTexture(`${data.id}.jpg`);
  const realClouds = useRealTexture(isEarth ? "earth_clouds.jpg" : null);
  const realNight = useRealTexture(isEarth ? "earth_night.jpg" : null);
  const realMoon = useRealTexture(isEarth ? "moon.jpg" : null);
  const { onTextureUpgraded } = useScene();

  const proceduralNeeded = real.status === "failed";
  const texture = useStagedTexture(data, quality.textureSize, selected, 150 + index * 220, proceduralNeeded);
  const hasReal = real.status === "ready" && real.tex !== null;

  // Keep the loading indicator honest: a planet counts as "done" once its real texture arrived.
  useEffect(() => { if (hasReal) onTextureUpgraded(); }, [hasReal, onTextureUpgraded]);

  const surfaceMaterial = useMemo(
    () => makeSurfaceMaterial(texture, radius, data.surface, isEarth),
    // The map is swapped through uniforms below; the material itself is created once per planet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [radius, data.surface, isEarth],
  );
  useEffect(() => { setUniform(surfaceMaterial, "uMap", real.tex ?? texture); }, [surfaceMaterial, texture, real.tex]);
  useEffect(() => {
    // Real imagery already contains its own detail, so use gentler bump than the procedural noise.
    setUniform(surfaceMaterial, "uBump", BUMP_BY_SURFACE[data.surface] * radius * (hasReal ? 0.45 : 1));
  }, [surfaceMaterial, hasReal, data.surface, radius]);
  useEffect(() => {
    setUniform(surfaceMaterial, "uNight", realNight.tex ?? real.tex ?? texture);
    setUniform(surfaceMaterial, "uNightAmt", realNight.tex ? 1.0 : 0);
  }, [surfaceMaterial, realNight.tex, real.tex, texture]);
  useEffect(() => () => surfaceMaterial.dispose(), [surfaceMaterial]);

  const cloudFallback = useMemo(() => (isEarth ? createCloudTexture(Math.min(quality.textureSize, 1024)) : null), [isEarth, quality.textureSize]);
  useEffect(() => () => cloudFallback?.dispose(), [cloudFallback]);
  const cloudMaterial = useMemo(() => {
    if (!cloudFallback) return null;
    return new THREE.ShaderMaterial({
      vertexShader: VERTEX, fragmentShader: CLOUD_FRAGMENT, transparent: true, depthWrite: false,
      uniforms: { uMap: { value: cloudFallback }, uAmbient: { value: 0.03 }, uLuma: { value: 0 } },
    });
  }, [cloudFallback]);
  useEffect(() => {
    if (!cloudMaterial) return;
    setUniform(cloudMaterial, "uMap", realClouds.tex ?? cloudFallback);
    setUniform(cloudMaterial, "uLuma", realClouds.tex ? 1 : 0);
  }, [cloudMaterial, cloudFallback, realClouds.tex]);
  useEffect(() => () => cloudMaterial?.dispose(), [cloudMaterial]);

  const moonFallback = useMemo(() => (isEarth ? createSurfaceTexture({ id: "mercury", surface: "rocky-grey" }, 512) : null), [isEarth]);
  useEffect(() => () => moonFallback?.dispose(), [moonFallback]);
  const moonMaterial = useMemo(() => {
    if (!moonFallback) return null;
    return makeSurfaceMaterial(moonFallback, radius * 0.27, "rocky-grey", false);
  }, [moonFallback, radius]);
  useEffect(() => {
    if (!moonMaterial) return;
    setUniform(moonMaterial, "uMap", realMoon.tex ?? moonFallback);
    setUniform(moonMaterial, "uNight", realMoon.tex ?? moonFallback);
    setUniform(moonMaterial, "uBump", 0.06 * radius * 0.27 * (realMoon.tex ? 0.45 : 1));
  }, [moonMaterial, moonFallback, realMoon.tex, radius]);
  useEffect(() => () => moonMaterial?.dispose(), [moonMaterial]);

  const labelTexture = useMemo(() => createLabelTexture(data.name, selected), [data.name, selected]);
  useEffect(() => () => labelTexture.dispose(), [labelTexture]);

  useEffect(() => {
    const map = bodies.current;
    const g = orbitGroup.current;
    if (g) map.set(data.id, g);
    return () => { map.delete(data.id); };
  }, [bodies, data.id]);

  useFrame(() => {
    const s = sim.current;
    const g = orbitGroup.current;
    if (g) {
      const [x, y, z] = orbitPosition(orbitAngle(s.hours, data), orbitR);
      g.position.set(x, y, z);
    }
    const rot = rotationAngle(s.rotHours, data);
    if (spin.current) spin.current.rotation.y = rot;
    if (clouds.current) clouds.current.rotation.y = rot * 1.08 + 0.4;
    if (moon.current) {
      // Moon: ~27.3 day period, visual radius chosen for legibility (not to scale).
      const a = (s.hours / (27.32 * 24)) * Math.PI * 2;
      moon.current.position.set(Math.cos(a) * radius * 2.3, 0, -Math.sin(a) * radius * 2.3);
    }
  });

  const tilt = THREE.MathUtils.degToRad(data.axialTiltDeg);

  return (
    <group ref={orbitGroup}>
      <group rotation={[0, 0, tilt]}>
        <mesh ref={spin} material={surfaceMaterial} onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}>
          <sphereGeometry args={[radius, seg, seg / 2]} />
        </mesh>
        {cloudMaterial && (
          <mesh ref={clouds} material={cloudMaterial} raycast={() => null}>
            <sphereGeometry args={[radius * 1.012, seg, seg / 2]} />
          </mesh>
        )}
        {quality.atmosphere && data.atmosphere && (
          <Atmosphere radius={radius} color={data.atmosphere.color} intensity={data.atmosphere.intensity} segments={seg} />
        )}
        {data.rings && (
          <PlanetRings
            planetRadius={radius}
            innerRatio={data.rings.innerRatio}
            outerRatio={data.rings.outerRatio}
            color={data.rings.color}
            seed={data.id.length * 97}
          />
        )}
      </group>
      {moonMaterial && (
        <mesh ref={moon} material={moonMaterial}>
          <sphereGeometry args={[radius * 0.27, 32, 16]} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[radius * 1.55, radius * 1.62, 64]} />
          <meshBasicMaterial color="#7fd0ff" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {/* Pure-three label (no DOM): avoids drei <Html>, which created its own React root and caused removeChild errors. */}
      <sprite position={[0, radius * 1.9 + 0.5, 0]} scale={[0.17, 0.0425, 1]} raycast={() => null} renderOrder={10}>
        <spriteMaterial map={labelTexture} transparent depthTest={false} sizeAttenuation={false} toneMapped={false} />
      </sprite>
    </group>
  );
}