"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { visualOrbitRadius } from "@/lib/rendering/scale";
import { useScene } from "./context";

/**
 * Main asteroid belt (statistical, not real individual asteroids).
 * Distribution follows the real belt: ~2.1-3.3 AU, low eccentricity and inclination,
 * with gaps near the 3:1, 5:2 and 7:3 Kirkwood resonances (2.50, 2.82, 2.95 AU).
 * Sizes are exaggerated so rocks are visible when zoomed in; the belt is NOT to scale.
 */
const A_MIN = 2.1;
const A_MAX = 3.3;
const KIRKWOOD_GAPS = [2.5, 2.82, 2.95];
const GAP_HALF_WIDTH = 0.03;
const TAU = Math.PI * 2;

function au(a: number): number {
  return visualOrbitRadius({ semiMajorAxisAu: a });
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BeltData {
  count: number;
  a: Float32Array; e: Float32Array; inc: Float32Array; node: Float32Array; m0: Float32Array;
  rate: Float32Array; // radians per simulated hour
  ax: Float32Array; ay: Float32Array; az: Float32Array; // tumble axis angles
  spin: Float32Array; size: Float32Array; sx: Float32Array; sz: Float32Array;
}

function generateBelt(count: number, seed: number): BeltData {
  const rnd = mulberry32(seed);
  const d: BeltData = {
    count,
    a: new Float32Array(count), e: new Float32Array(count), inc: new Float32Array(count), node: new Float32Array(count),
    m0: new Float32Array(count), rate: new Float32Array(count), ax: new Float32Array(count), ay: new Float32Array(count),
    az: new Float32Array(count), spin: new Float32Array(count), size: new Float32Array(count),
    sx: new Float32Array(count), sz: new Float32Array(count),
  };
  for (let i = 0; i < count; i++) {
    let a = 0;
    do {
      a = A_MIN + (A_MAX - A_MIN) * ((rnd() + rnd()) / 2); // triangular, peaked near 2.7 AU
    } while (KIRKWOOD_GAPS.some((g) => Math.abs(a - g) < GAP_HALF_WIDTH));
    d.a[i] = a;
    d.e[i] = Math.min(0.25, rnd() * rnd() * 0.5);
    const gauss = (rnd() + rnd() + rnd() - 1.5) / 1.5; // roughly -1..1, bell-shaped
    d.inc[i] = THREE.MathUtils.degToRad(gauss * 14);
    d.node[i] = rnd() * TAU;
    d.m0[i] = rnd() * TAU;
    d.rate[i] = TAU / (365.256 * 24 * Math.pow(a, 1.5)); // Kepler's third law
    d.ax[i] = rnd() * TAU; d.ay[i] = rnd() * TAU; d.az[i] = rnd() * TAU;
    d.spin[i] = (rnd() * 0.6 + 0.1) * (rnd() < 0.5 ? -1 : 1) * 0.02;
    d.size[i] = 0.04 * Math.pow(4, rnd() * rnd() * 1.4 + rnd() * 0.3); // mostly small, few large
    d.sx[i] = 0.7 + rnd() * 0.6; d.sz[i] = 0.7 + rnd() * 0.6;
  }
  return d;
}

function makeRockGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const pos = g.attributes.position;
  const rnd = mulberry32(4242);
  const v = new THREE.Vector3();
  const seen = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let k = seen.get(key);
    if (k === undefined) { k = 0.72 + rnd() * 0.5; seen.set(key, k); } // same factor for shared vertices
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  return g;
}

const ROCK_VERTEX = /* glsl */ `
varying vec3 vWP;
varying vec3 vTint;
void main() {
  mat4 m = modelMatrix;
  vec3 tint = vec3(1.0);
  #ifdef USE_INSTANCING
    m = modelMatrix * instanceMatrix;
  #endif
  #ifdef USE_INSTANCING_COLOR
    tint = instanceColor;
  #endif
  vec4 wp = m * vec4(position, 1.0);
  vWP = wp.xyz;
  vTint = tint;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// Facet normals from screen-space derivatives give rocks a faceted, rugged look. Sun is at the origin.
const ROCK_FRAGMENT = /* glsl */ `
varying vec3 vWP;
varying vec3 vTint;
void main() {
  vec3 N = normalize(cross(dFdx(vWP), dFdy(vWP)));
  vec3 V = normalize(cameraPosition - vWP);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(-vWP);
  float lit = max(dot(N, L), 0.0);
  vec3 c = vTint * (0.05 + lit * 1.2);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

/** Rock count per quality level (keyed by texture size, which maps 1:1 to the presets). */
function rockCount(textureSize: number): number {
  if (textureSize <= 512) return 350;
  if (textureSize <= 1024) return 800;
  if (textureSize <= 2048) return 1400;
  return 2200;
}

export function AsteroidBelt() {
  const { sim, quality } = useScene();
  const count = rockCount(quality.textureSize);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dust = useRef<THREE.Points>(null);
  const lastHours = useRef(Number.NaN);

  const data = useMemo(() => generateBelt(count, 20260), [count]);
  const geometry = useMemo(() => makeRockGeometry(), []);
  const material = useMemo(() => new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader: ROCK_FRAGMENT }), []);

  // Faint dust points so the belt reads as a belt even when zoomed far out (rocks are sub-pixel there).
  const dustGeometry = useMemo(() => {
    const n = quality.starCount > 4000 ? 7000 : quality.starCount > 2000 ? 4500 : 2200;
    const belt = generateBelt(n, 777);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = belt.m0[i] + 2 * belt.e[i] * Math.sin(belt.m0[i]);
      const r = au(belt.a[i] * (1 - belt.e[i] * belt.e[i]) / (1 + belt.e[i] * Math.cos(theta)));
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = r * Math.sin(belt.inc[i]) * Math.sin(theta - belt.node[i]);
      pos[i * 3 + 2] = -Math.sin(theta) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [quality.starCount]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const c = new THREE.Color();
    const rnd = mulberry32(99);
    for (let i = 0; i < count; i++) {
      c.setHSL(0.07 + rnd() * 0.04, 0.12 + rnd() * 0.18, 0.18 + rnd() * 0.26);
      m.setColorAt(i, c);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    lastHours.current = Number.NaN; // force first matrix write
  }, [count, data]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => dustGeometry.dispose(), [dustGeometry]);

  useFrame(() => {
    const hours = sim.current.hours;
    // Dust ring turns at the belt's mean motion (a ~ 2.7 AU).
    if (dust.current) dust.current.rotation.y = (hours / (365.256 * 24 * Math.pow(2.7, 1.5))) * TAU;

    const m = mesh.current;
    if (!m || hours === lastHours.current) return; // nothing to do while paused
    lastHours.current = hours;

    const d = data;
    const tmpM = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let i = 0; i < d.count; i++) {
      const M = d.m0[i] + d.rate[i] * hours;
      const theta = M + 2 * d.e[i] * Math.sin(M); // first-order equation of the centre
      const r = au(d.a[i] * (1 - d.e[i] * d.e[i]) / (1 + d.e[i] * Math.cos(theta)));
      p.set(Math.cos(theta) * r, r * Math.sin(d.inc[i]) * Math.sin(theta - d.node[i]), -Math.sin(theta) * r);
      const t = hours * d.spin[i];
      e.set(d.ax[i] + t, d.ay[i] + t * 0.7, d.az[i]);
      q.setFromEuler(e);
      const sz = d.size[i];
      s.set(sz * d.sx[i], sz, sz * d.sz[i]);
      tmpM.compose(p, q, s);
      m.setMatrixAt(i, tmpM);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh key={count} ref={mesh} args={[geometry, material, count]} frustumCulled={false} raycast={() => null} />
      <points ref={dust} geometry={dustGeometry} frustumCulled={false} raycast={() => null}>
        <pointsMaterial color="#9a8f80" size={1.3} sizeAttenuation={false} transparent opacity={0.55} depthWrite={false} />
      </points>
    </>
  );
}