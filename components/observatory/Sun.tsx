"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SUN_VISUAL_RADIUS } from "@/lib/rendering/scale";
import { createSunTexture } from "@/lib/rendering/textures";
import { useScene } from "./context";

const R = SUN_VISUAL_RADIUS;
const REAL_SUN_URL = "/textures/sun.jpg";

/* ------------------------------------------------------------------ */
/* Surface shader: animated granulation, sunspots, limb darkening      */
/* ------------------------------------------------------------------ */

const SURFACE_VERTEX = /* glsl */ `
varying vec3 vPos;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
void main() {
  vUv = uv;
  vPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const SURFACE_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
varying vec3 vPos;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < OCTAVES; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}

void main() {
  vec3 n = normalize(vPos);
  float t = uTime;

  // Domain-warped convection: bright granules (hot plasma rising) with darker lanes between them.
  vec3 warp = vec3(fbm(n * 3.0 + t * 0.03), fbm(n * 3.0 + 7.1 - t * 0.03), fbm(n * 3.0 + 13.3 + t * 0.02));
  float gran  = fbm(n * 9.0 + warp * 1.5 + vec3(0.0, t * 0.08, 0.0));
  float gran2 = fbm(n * 22.0 - warp + vec3(t * 0.12, 0.0, 0.0));
  float cells = smoothstep(0.28, 0.72, gran * 0.65 + gran2 * 0.35);

  // Sunspots: cooler dark patches at low/mid latitudes, drifting very slowly.
  float spots = smoothstep(0.60, 0.70, fbm(n * 2.2 + 31.7 + t * 0.004));
  spots *= 1.0 - smoothstep(0.55, 0.85, abs(n.y));

  vec3 tex = texture2D(uMap, vUv).rgb;
  vec3 cool = vec3(1.0, 0.25, 0.02);
  vec3 hot  = vec3(1.0, 0.88, 0.50);
  vec3 col = mix(cool, hot, cells) * (0.65 + 0.75 * dot(tex, vec3(0.3333)));
  col *= 1.0 - 0.72 * spots;

  // Limb darkening and reddening: the edge looks dimmer and redder because we see higher, cooler layers.
  float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  float limb = 0.32 + 0.68 * pow(mu, 0.5);
  col = mix(col * vec3(1.0, 0.5, 0.22), col, smoothstep(0.0, 0.7, mu)) * limb;
  col *= 1.5;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/* Thin glowing shell at the limb (chromosphere). */
const RIM_VERTEX = /* glsl */ `
varying vec3 vNormal; varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const RIM_FRAGMENT = /* glsl */ `
uniform vec3 uColor; uniform float uIntensity;
varying vec3 vNormal; varying vec3 vView;
void main() {
  float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
  gl_FragColor = vec4(uColor, f * uIntensity);
}`;

function setUniform(material: THREE.ShaderMaterial, name: string, value: unknown) {
  material.uniforms[name].value = value;
}

/* ------------------------------------------------------------------ */
/* Textures                                                            */
/* ------------------------------------------------------------------ */

function glowTexture(falloff: number): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (let i = 0; i <= 10; i++) g.addColorStop(i / 10, `rgba(255,255,255,${Math.pow(1 - i / 10, falloff)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

/** Radial streaks (coronal streamers), faded toward the edge so no square outline shows. */
function raysTexture(seed: number): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  let state = seed;
  const rnd = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  ctx.translate(s / 2, s / 2);
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const len = s * (0.22 + rnd() * 0.28);
    const w = 0.004 + rnd() * 0.02;
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    g.addColorStop(0, `rgba(255,255,255,${0.35 + rnd() * 0.4})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len);
    ctx.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  const mask = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.7, "rgba(0,0,0,0.6)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

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

/* ------------------------------------------------------------------ */
/* Prominences: glowing plasma loops that rise, stream, and fade       */
/* ------------------------------------------------------------------ */

const PER_LOOP = 70;

interface LoopState {
  a: Float32Array; t: Float32Array; beta: Float32Array; H: Float32Array;
  period: Float32Array; offset: Float32Array; cycle: Int32Array;
  s0: Float32Array; v: Float32Array; j: Float32Array;
}

function randomizeLoop(st: LoopState, k: number) {
  const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
  let x = g(), y = g() * 0.8, z = g();
  let l = Math.hypot(x, y, z) || 1;
  const ax = x / l, ay = y / l, az = z / l;
  x = g(); y = g(); z = g();
  const d = x * ax + y * ay + z * az;
  x -= ax * d; y -= ay * d; z -= az * d;
  l = Math.hypot(x, y, z) || 1;
  st.a.set([ax, ay, az], k * 3);
  st.t.set([x / l, y / l, z / l], k * 3);
  st.beta[k] = 0.1 + Math.random() * 0.18;
  st.H[k] = 0.2 + Math.random() * 0.35;
}

function initLoops(loops: number): LoopState {
  const n = loops * PER_LOOP;
  const st: LoopState = {
    a: new Float32Array(loops * 3), t: new Float32Array(loops * 3), beta: new Float32Array(loops), H: new Float32Array(loops),
    period: new Float32Array(loops), offset: new Float32Array(loops), cycle: new Int32Array(loops),
    s0: new Float32Array(n), v: new Float32Array(n), j: new Float32Array(n),
  };
  for (let k = 0; k < loops; k++) {
    st.period[k] = 9 + Math.random() * 8;
    st.offset[k] = Math.random() * st.period[k] * 3;
    st.cycle[k] = Math.floor(st.offset[k] / st.period[k]);
    randomizeLoop(st, k);
  }
  for (let i = 0; i < n; i++) { st.s0[i] = Math.random(); st.v[i] = 0.6 + Math.random() * 0.8; st.j[i] = Math.random() - 0.5; }
  return st;
}

function SolarFlares({ loops, dot }: { loops: number; dot: THREE.Texture }) {
  const { sim } = useScene();
  const pointsRef = useRef<THREE.Points>(null);
  const clock = useRef(0);
  const state = useRef<LoopState | null>(null);
  const n = loops * PER_LOOP;

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, [n]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => { state.current = initLoops(loops); }, [loops]);

  useFrame((_, delta) => {
    const st = state.current;
    const pts = pointsRef.current;
    if (!st || !pts) return;
    if (sim.current.speed !== 0) clock.current += Math.min(delta, 0.05); // frozen while the simulation is paused
    const c = clock.current;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const col = pts.geometry.attributes.color as THREE.BufferAttribute;
    const pa = pos.array as Float32Array, ca = col.array as Float32Array;

    for (let k = 0; k < loops; k++) {
      const cyc = (c + st.offset[k]) / st.period[k];
      const idx = Math.floor(cyc);
      if (idx !== st.cycle[k]) { st.cycle[k] = idx; randomizeLoop(st, k); } // a new eruption somewhere else
      const env = Math.pow(Math.sin(Math.PI * (cyc - idx)), 1.5);
      const ax = st.a[k * 3], ay = st.a[k * 3 + 1], az = st.a[k * 3 + 2];
      const tx = st.t[k * 3], ty = st.t[k * 3 + 1], tz = st.t[k * 3 + 2];
      for (let p = 0; p < PER_LOOP; p++) {
        const i = k * PER_LOOP + p;
        const s = (st.s0[i] + c * 0.07 * st.v[i]) % 1; // plasma streams along the magnetic loop
        const ang = (s * 2 - 1) * st.beta[k];
        const ca_ = Math.cos(ang), sa_ = Math.sin(ang);
        const r = R * (1.0 + st.H[k] * Math.sin(Math.PI * s)) + st.j[i] * 0.06;
        pa[i * 3] = (ax * ca_ + tx * sa_) * r;
        pa[i * 3 + 1] = (ay * ca_ + ty * sa_) * r;
        pa[i * 3 + 2] = (az * ca_ + tz * sa_) * r;
        const h = Math.sin(Math.PI * s);
        ca[i * 3] = env; ca[i * 3 + 1] = env * (0.3 + 0.45 * h); ca[i * 3 + 2] = env * 0.07;
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} raycast={() => null}>
      <pointsMaterial map={dot} size={3.4} sizeAttenuation={false} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Sun                                                                 */
/* ------------------------------------------------------------------ */

function tierOf(textureSize: number): number {
  return textureSize <= 512 ? 0 : textureSize <= 1024 ? 1 : textureSize <= 2048 ? 2 : 3;
}

export function Sun() {
  const { quality, bodies, onSelect, sim } = useScene();
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const glowInner = useRef<THREE.Sprite>(null);
  const glowOuter = useRef<THREE.Sprite>(null);
  const glowHalo = useRef<THREE.Sprite>(null);
  const raysA = useRef<THREE.Sprite>(null);
  const raysB = useRef<THREE.Sprite>(null);
  const clock = useRef(0);

  const fallback = useMemo(() => createSunTexture(Math.min(quality.textureSize, 2048)), [quality.textureSize]);
  const realTex = useRealSunTexture();
  const map = realTex ?? fallback;

  const glowSoft = useMemo(() => glowTexture(2.4), []);
  const glowWide = useMemo(() => glowTexture(1.4), []);
  const rays1 = useMemo(() => (quality.corona ? raysTexture(11) : null), [quality.corona]);
  const rays2 = useMemo(() => (quality.corona ? raysTexture(97) : null), [quality.corona]);

  const octaves = quality.sphereSegments >= 64 ? 4 : 3;
  const surface = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: SURFACE_VERTEX,
      fragmentShader: SURFACE_FRAGMENT,
      defines: { OCTAVES: octaves },
      uniforms: { uMap: { value: null }, uTime: { value: 0 } },
    }),
    [octaves],
  );
  const rim = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: RIM_VERTEX, fragmentShader: RIM_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color("#ff9a3a") }, uIntensity: { value: 0.9 } },
    }),
    [],
  );

  useEffect(() => { setUniform(surface, "uMap", map); }, [surface, map]);
  useEffect(() => () => surface.dispose(), [surface]);
  useEffect(() => () => rim.dispose(), [rim]);
  useEffect(() => () => fallback.dispose(), [fallback]);
  useEffect(() => () => glowSoft.dispose(), [glowSoft]);
  useEffect(() => () => glowWide.dispose(), [glowWide]);
  useEffect(() => () => rays1?.dispose(), [rays1]);
  useEffect(() => () => rays2?.dispose(), [rays2]);
  useEffect(() => {
    const m = bodies.current;
    if (group.current) m.set("sun", group.current);
    return () => { m.delete("sun"); };
  }, [bodies]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (sim.current.speed !== 0) clock.current += dt; // the Sun's surface boils in real time, frozen while paused
    const c = clock.current;
    setUniform(surface, "uTime", c);
    if (mesh.current) mesh.current.rotation.y += dt * 0.02;

    const pulse = 1 + 0.035 * Math.sin(c * 0.8) + 0.02 * Math.sin(c * 2.3 + 1.3);
    glowInner.current?.scale.setScalar(R * 3.4 * pulse);
    glowOuter.current?.scale.setScalar(R * 7.5 * (1 + 0.02 * Math.sin(c * 0.5)));
    glowHalo.current?.scale.setScalar(R * 15);
    if (raysA.current) raysA.current.material.rotation = c * 0.012;
    if (raysB.current) raysB.current.material.rotation = -c * 0.008 + 1.0;
  });

  const loops = [0, 4, 6, 8][tierOf(quality.textureSize)];

  return (
    <group ref={group}>
      <pointLight intensity={9} decay={0} distance={0} color="#fff3e0" />

      <mesh ref={mesh} material={surface} onClick={(e) => { e.stopPropagation(); onSelect("sun"); }}>
        <sphereGeometry args={[R, quality.sphereSegments, quality.sphereSegments / 2]} />
      </mesh>

      {/* Chromosphere rim */}
      <mesh raycast={() => null}>
        <sphereGeometry args={[R * 1.04, 48, 24]} />
        <primitive object={rim} attach="material" />
      </mesh>

      {/* Glow layers (cheap; always on) */}
      <sprite ref={glowInner} raycast={() => null}>
        <spriteMaterial map={glowSoft} color="#fff0c4" transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite ref={glowOuter} raycast={() => null}>
        <spriteMaterial map={glowWide} color="#ff9a3a" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>

      {/* Corona streamers, outer halo and prominences (Balanced quality and up) */}
      {quality.corona && rays1 && rays2 && (
        <>
          <sprite ref={glowHalo} raycast={() => null}>
            <spriteMaterial map={glowWide} color="#ff7a24" transparent opacity={0.13} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          <sprite ref={raysA} scale={[R * 11, R * 11, 1]} raycast={() => null}>
            <spriteMaterial map={rays1} color="#ffd89a" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          <sprite ref={raysB} scale={[R * 9, R * 9, 1]} raycast={() => null}>
            <spriteMaterial map={rays2} color="#ffb870" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          {loops > 0 && <SolarFlares loops={loops} dot={glowSoft} />}
        </>
      )}
    </group>
  );
}