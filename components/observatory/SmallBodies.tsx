"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { visualOrbitRadius } from "@/lib/rendering/scale";
import { COMETS, cometOrbitPath, cometVisualPosition, type CometData } from "@/lib/simulation/kepler";
import { useScene } from "./context";

/*
 * Small bodies and the interplanetary medium.
 *
 *  - Comets: real orbital elements (approximate), Kepler-solved, with dust + ion tails pointing away from the Sun.
 *  - Kuiper belt: statistical (30-100 AU, plutino cluster at 39.4 AU, scattered disc).
 *  - Oort cloud: HYPOTHETICAL and never directly observed. Radii use a log scale so it fits the scene.
 *  - Dust, solar wind, heliosphere, meteoroids: schematic. Not to scale.
 */

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

function tierOf(textureSize: number): 0 | 1 | 2 | 3 {
  if (textureSize <= 512) return 0;
  if (textureSize <= 1024) return 1;
  if (textureSize <= 2048) return 2;
  return 3;
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
/** Roughly standard-normal (sum of three uniforms). */
function gauss(rnd: () => number): number {
  return (rnd() + rnd() + rnd() - 1.5) / 0.5;
}
function au(a: number): number {
  return visualOrbitRadius({ semiMajorAxisAu: a });
}
function periodHours(aAu: number): number {
  return 365.256 * 24 * Math.pow(aAu, 1.5);
}

function useDotTexture(): THREE.CanvasTexture {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function createLabelTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#bcd7ff";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 6;
  ctx.fillText(text.toUpperCase(), 128, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ================================== COMETS ================================== */

const TAIL_COUNTS: [number, number][] = [[110, 60], [180, 90], [260, 140], [360, 200]]; // [dust, ion] per tier
const UP = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3();
const _v = new THREE.Vector3();
const _d = new THREE.Vector3();
const _u1 = new THREE.Vector3();
const _u2 = new THREE.Vector3();
const _dir = new THREE.Vector3();

function buildTail(dust: number, ion: number, seed: number) {
  const rnd = mulberry32(seed);
  const n = dust + ion;
  const phase = new Float32Array(n), v = new Float32Array(n), s1 = new Float32Array(n), s2 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const isIon = i >= dust;
    phase[i] = rnd(); // where along the tail this particle starts (0 = nucleus, 1 = tail end)
    v[i] = (0.6 + rnd() * 0.8) * (isIon ? 1.5 : 1); // per-particle flow speed so the stream looks organic
    s1[i] = gauss(rnd); s2[i] = gauss(rnd);
  }
  return { n, dust, phase, v, s1, s2 };
}

function Comet({ data, tier, index }: { data: CometData; tier: 0 | 1 | 2 | 3; index: number }) {
  const { sim } = useScene();
  const dot = useDotTexture();
  const group = useRef<THREE.Group>(null);
  const nucleus = useRef<THREE.Mesh>(null);
  const coma = useRef<THREE.Sprite>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const flow = useRef(0);

  const [dustN, ionN] = TAIL_COUNTS[tier];
  const tail = useMemo(() => buildTail(dustN, ionN, 1000 + index * 17), [dustN, ionN, index]);

  const tailGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tail.n * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(tail.n * 3), 3));
    return g;
  }, [tail]);
  useEffect(() => () => tailGeometry.dispose(), [tailGeometry]);

  const orbitLine = useMemo(() => {
    const pts = cometOrbitPath(data).map((p) => new THREE.Vector3(...p));
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: "#6f8fb5", transparent: true, opacity: 0.22 }),
    );
  }, [data]);
  useEffect(() => () => { orbitLine.geometry.dispose(); (orbitLine.material as THREE.Material).dispose(); }, [orbitLine]);

  const labelTex = useMemo(() => createLabelTexture(data.name), [data.name]);
  useEffect(() => () => labelTex.dispose(), [labelTex]);

  useFrame((_, delta) => {
    // Tail particles flow in real time (decorative), frozen while the simulation is paused.
    if (sim.current.speed !== 0) flow.current += Math.min(delta, 0.05);
    const clock = flow.current;
    const hours = sim.current.hours;
    const cur = cometVisualPosition(data, hours);
    const nxt = cometVisualPosition(data, hours + 12);
    _p.set(cur.pos[0], cur.pos[1], cur.pos[2]);
    _v.set(nxt.pos[0], nxt.pos[1], nxt.pos[2]).sub(_p);
    if (_v.lengthSq() > 1e-14) _v.normalize(); else _v.set(0, 0, 0);
    _d.copy(_p).normalize(); // direction away from the Sun

    // Comets only grow a coma and tails when sunlight is strong enough (inside roughly 5 AU).
    const act = Math.pow(Math.min(1, Math.max(0, (5 - cur.rAu) / 4.4)), 1.4);
    const L = 3 + 36 * act;

    if (group.current) group.current.position.copy(_p);
    if (nucleus.current) nucleus.current.position.set(0, 0, 0);
    if (coma.current) {
      coma.current.scale.setScalar((1.2 + act * 2.6) * (1 + 0.07 * Math.sin(clock * 2.1)));
      coma.current.material.opacity = 0.2 + 0.5 * act;
    }

    const pts = pointsRef.current;
    if (!pts) return;
    pts.visible = act > 0.02;
    if (!pts.visible) return;
    (pts.material as THREE.PointsMaterial).opacity = 0.15 + 0.8 * act;

    _u1.crossVectors(_d, UP);
    if (_u1.lengthSq() < 1e-6) _u1.set(1, 0, 0);
    _u1.normalize();
    _u2.crossVectors(_d, _u1);

    const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = pts.geometry.attributes.color as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const carr = colAttr.array as Float32Array;
    for (let i = 0; i < tail.n; i++) {
      // Each particle drifts from the nucleus to the tail end, then wraps around: a continuous stream.
      const u = (tail.phase[i] + clock * tail.v[i] * 0.18) % 1;
      const t = Math.pow(u, 1.5); // denser near the head
      const wob1 = tail.s1[i] + 0.35 * Math.sin(clock * 1.7 + i * 0.37);
      const wob2 = tail.s2[i] + 0.35 * Math.cos(clock * 1.3 + i * 0.29);
      const isDust = i < tail.dust;
      let dist: number, lat: number;
      if (isDust) {
        // Dust tail: curved backward along the orbit, wide.
        _dir.copy(_d).addScaledVector(_v, -0.45 * t).normalize();
        dist = t * L * 0.85;
        lat = (0.01 + 0.06 * t) * L;
      } else {
        // Ion (plasma) tail: straight, thin, away from the Sun.
        _dir.copy(_d);
        dist = t * L * 1.1;
        lat = (0.006 + 0.01 * t) * L;
      }
      arr[i * 3] = _dir.x * dist + (_u1.x * wob1 + _u2.x * wob2) * lat;
      arr[i * 3 + 1] = _dir.y * dist + (_u1.y * wob1 + _u2.y * wob2) * lat;
      arr[i * 3 + 2] = _dir.z * dist + (_u1.z * wob1 + _u2.z * wob2) * lat;

      const fade = Math.pow(1 - t, 1.3) * Math.min(1, u / 0.06); // fade in at the nucleus, fade out along the tail
      if (isDust) { carr[i * 3] = fade; carr[i * 3 + 1] = 0.92 * fade; carr[i * 3 + 2] = 0.78 * fade; }
      else { carr[i * 3] = 0.45 * fade; carr[i * 3 + 1] = 0.7 * fade; carr[i * 3 + 2] = fade; }
    }
    attr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <>
      <primitive object={orbitLine} raycast={() => null} />
      <group ref={group}>
        <mesh ref={nucleus} raycast={() => null}>
          <icosahedronGeometry args={[0.14, 1]} />
          <meshBasicMaterial color="#9a8f84" />
        </mesh>
        <sprite ref={coma} raycast={() => null}>
          <spriteMaterial map={dot} color="#bfe3ff" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <points ref={pointsRef} geometry={tailGeometry} frustumCulled={false} raycast={() => null}>
          <pointsMaterial map={dot} size={3} sizeAttenuation={false} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
        <sprite position={[0, 1.1, 0]} scale={[0.12, 0.03, 1]} raycast={() => null} renderOrder={10}>
          <spriteMaterial map={labelTex} transparent depthTest={false} sizeAttenuation={false} opacity={0.85} toneMapped={false} />
        </sprite>
      </group>
    </>
  );
}

export function Comets() {
  const { quality } = useScene();
  const tier = tierOf(quality.textureSize);
  return <>{COMETS.map((c, i) => <Comet key={c.id} data={c} tier={tier} index={i} />)}</>;
}

/* ================================= METEOROIDS ================================ */

/** Decorative and deliberately sparse: a few streaks at a time, with pauses between them. */
const METEOR_COUNT = [3, 4, 6, 8];
const METEOR_RADIUS = 70;

interface MeteorState { pos: Float32Array; vel: Float32Array; speed: Float32Array; wait: Float32Array }

function respawnMeteor(s: MeteorState, i: number, stagger: boolean) {
  const rnd = Math.random;
  const ux = gauss(rnd), uy = gauss(rnd), uz = gauss(rnd);
  const ul = Math.hypot(ux, uy, uz) || 1;
  let px = (ux / ul) * METEOR_RADIUS, py = (uy / ul) * METEOR_RADIUS, pz = (uz / ul) * METEOR_RADIUS;
  const tx = gauss(rnd) * 10, ty = gauss(rnd) * 4, tz = gauss(rnd) * 10; // aim near the inner system
  let dx = tx - px, dy = ty - py, dz = tz - pz;
  const dl = Math.hypot(dx, dy, dz) || 1;
  const speed = 14 + rnd() * 22;
  dx = (dx / dl) * speed; dy = (dy / dl) * speed; dz = (dz / dl) * speed;
  if (stagger) {
    const adv = rnd() * ((METEOR_RADIUS * 2) / speed) * 0.9;
    px += dx * adv; py += dy * adv; pz += dz * adv;
  }
  s.pos.set([px, py, pz], i * 3);
  s.vel.set([dx, dy, dz], i * 3);
  s.speed[i] = speed;
  s.wait[i] = 1 + rnd() * 7; // rest period before this meteoroid appears (seconds of running simulation)
}

export function Meteoroids() {
  const { sim, quality } = useScene();
  const count = METEOR_COUNT[tierOf(quality.textureSize)];
  const lines = useRef<THREE.LineSegments>(null);
  const state = useRef<MeteorState | null>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    const col = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) col.set([1, 0.96, 0.85, 0, 0, 0], i * 6); // bright head, transparent tail (additive)
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const s: MeteorState = { pos: new Float32Array(count * 3), vel: new Float32Array(count * 3), speed: new Float32Array(count), wait: new Float32Array(count) };
    for (let i = 0; i < count; i++) respawnMeteor(s, i, true);
    state.current = s;
  }, [count]);

  useFrame((_, delta) => {
    const s = state.current;
    const ls = lines.current;
    if (!s || !ls) return;
    const dt = sim.current.speed === 0 ? 0 : Math.min(delta, 0.05); // decorative: real time, frozen while paused
    const arr = (ls.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      const j = i * 6;
      if (s.wait[i] > 0) {
        // Resting: zero-length segment (invisible) until its wait is over.
        s.wait[i] -= dt;
        arr[j] = arr[j + 3] = s.pos[k]; arr[j + 1] = arr[j + 4] = s.pos[k + 1]; arr[j + 2] = arr[j + 5] = s.pos[k + 2];
        continue;
      }
      if (dt > 0) {
        s.pos[k] += s.vel[k] * dt; s.pos[k + 1] += s.vel[k + 1] * dt; s.pos[k + 2] += s.vel[k + 2] * dt;
        const r2 = s.pos[k] ** 2 + s.pos[k + 1] ** 2 + s.pos[k + 2] ** 2;
        const outward = s.pos[k] * s.vel[k] + s.pos[k + 1] * s.vel[k + 1] + s.pos[k + 2] * s.vel[k + 2] > 0;
        if (outward && r2 > (METEOR_RADIUS + 4) ** 2) respawnMeteor(s, i, false);
      }
      const trail = s.speed[i] * 0.07;
      const inv = trail / s.speed[i];
      arr[j] = s.pos[k]; arr[j + 1] = s.pos[k + 1]; arr[j + 2] = s.pos[k + 2];
      arr[j + 3] = s.pos[k] - s.vel[k] * inv; arr[j + 4] = s.pos[k + 1] - s.vel[k + 1] * inv; arr[j + 5] = s.pos[k + 2] - s.vel[k + 2] * inv;
    }
    (ls.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <lineSegments ref={lines} geometry={geometry} frustumCulled={false} raycast={() => null}>
      <lineBasicMaterial vertexColors transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

/* ============================ KUIPER BELT & OORT CLOUD ============================ */

const KUIPER_COUNT = [2500, 5000, 9000, 14000];
const OORT_COUNT = [2500, 5000, 8000, 12000];

function PointCloud({ positions, color, size, opacity, map }: { positions: Float32Array; color: string; size: number; opacity: number; map: THREE.Texture }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry} frustumCulled={false} raycast={() => null}>
      <pointsMaterial color={color} map={map} size={size} sizeAttenuation={false} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

export function KuiperBelt() {
  const { sim, quality } = useScene();
  const n = KUIPER_COUNT[tierOf(quality.textureSize)];
  const dot = useDotTexture();
  const group = useRef<THREE.Group>(null);

  const positions = useMemo(() => {
    const rnd = mulberry32(31337);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rnd();
      let a: number, e: number, sig: number;
      if (u < 0.15) { a = 39.4 + (rnd() - 0.5) * 0.8; e = 0.1 + rnd() * 0.15; sig = 10; } // plutinos (3:2 with Neptune)
      else if (u < 0.85) { a = 42 + 6 * ((rnd() + rnd()) / 2); e = rnd() * rnd() * 0.12; sig = 6; } // classical belt
      else { a = 48 + 32 * rnd() * rnd(); e = 0.15 + rnd() * 0.35; sig = 18; } // scattered disc
      const M = rnd() * TAU, node = rnd() * TAU, inc = gauss(rnd) * sig * DEG;
      const theta = M + 2 * e * Math.sin(M);
      const rv = au((a * (1 - e * e)) / (1 + e * Math.cos(theta)));
      pos[i * 3] = Math.cos(theta) * rv;
      pos[i * 3 + 1] = rv * Math.sin(inc) * Math.sin(theta - node);
      pos[i * 3 + 2] = -Math.sin(theta) * rv;
    }
    return pos;
  }, [n]);

  useFrame(() => {
    if (group.current) group.current.rotation.y = (sim.current.hours / periodHours(43)) * TAU; // mean motion at ~43 AU
  });

  return (
    <group ref={group}>
      <PointCloud positions={positions} color="#8fa9c4" size={1.7} opacity={0.6} map={dot} />
    </group>
  );
}

/** Oort cloud radii: 2,000-100,000 AU mapped logarithmically onto 200-330 scene units. */
const OORT_R_MIN = 200;
const OORT_R_SPAN = 130;

export function OortCloud() {
  const { quality } = useScene();
  const n = OORT_COUNT[tierOf(quality.textureSize)];
  const dot = useDotTexture();

  const positions = useMemo(() => {
    const rnd = mulberry32(777);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const inner = rnd() < 0.25; // Hills (inner) cloud: flattened; outer cloud: spherical
      const a = inner ? 2000 * Math.pow(10, rnd() * 1.0) : 20000 * Math.pow(10, rnd() * 0.699);
      const r = OORT_R_MIN + (OORT_R_SPAN * Math.log10(a / 2000)) / Math.log10(50);
      let x = gauss(rnd), y = gauss(rnd), z = gauss(rnd);
      if (inner) y *= 0.35;
      const l = Math.hypot(x, y, z) || 1;
      x /= l; y /= l; z /= l;
      pos.set([x * r, y * r, z * r], i * 3);
    }
    return pos;
  }, [n]);

  return <PointCloud positions={positions} color="#a9c9ff" size={2.2} opacity={0.55} map={dot} />;
}

/* ===================== INTERPLANETARY DUST, SOLAR WIND, HELIOSPHERE ===================== */

const DUST_COUNT = [3000, 6000, 10000, 15000];
const WIND_COUNT = [800, 1600, 2800, 4200];
const HELIO_R = au(120); // heliopause is roughly 120 AU (crossed by Voyager 1 and 2); drawn as a sphere here
const WIND_R0 = 6.5;

export function InterplanetaryDust() {
  const { sim, quality } = useScene();
  const n = DUST_COUNT[tierOf(quality.textureSize)];
  const dot = useDotTexture();
  const group = useRef<THREE.Group>(null);

  const positions = useMemo(() => {
    const rnd = mulberry32(2468);
    const pos = new Float32Array(n * 3);
    const rMin = 0.15, rMax = 4, p = 0.3;
    for (let i = 0; i < n; i++) {
      // Density falling roughly as r^-1.3 (zodiacal cloud), concentrated near the ecliptic.
      const u = rnd();
      const rAu = Math.pow(Math.pow(rMin, -p) - u * (Math.pow(rMin, -p) - Math.pow(rMax, -p)), -1 / p);
      const rv = au(rAu);
      const th = rnd() * TAU;
      pos.set([Math.cos(th) * rv, rv * gauss(rnd) * 0.045, -Math.sin(th) * rv], i * 3);
    }
    return pos;
  }, [n]);

  useFrame(() => {
    if (group.current) group.current.rotation.y = (sim.current.hours / periodHours(1)) * TAU;
  });

  return (
    <group ref={group}>
      <PointCloud positions={positions} color="#d9c9a3" size={1.5} opacity={0.3} map={dot} />
    </group>
  );
}

const HELIO_VERTEX = /* glsl */ `
varying vec3 vNormal; varying vec3 vView;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const HELIO_FRAGMENT = /* glsl */ `
uniform vec3 uColor; uniform float uIntensity;
varying vec3 vNormal; varying vec3 vView;
void main(){
  float f = pow(1.0 - abs(dot(vNormal, vView)), 2.6);
  gl_FragColor = vec4(uColor, f * uIntensity);
}`;

export function SolarWind() {
  const { sim, quality } = useScene();
  const n = WIND_COUNT[tierOf(quality.textureSize)];
  const dot = useDotTexture();
  const pointsRef = useRef<THREE.Points>(null);
  const radii = useRef<Float32Array | null>(null);
  const dirs = useRef<Float32Array | null>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, [n]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const rnd = mulberry32(555);
    const r = new Float32Array(n);
    const d = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      r[i] = WIND_R0 + rnd() * (HELIO_R - WIND_R0);
      let x = gauss(rnd), y = gauss(rnd) * 0.7, z = gauss(rnd);
      const l = Math.hypot(x, y, z) || 1;
      x /= l; y /= l; z /= l;
      d.set([x, y, z], i * 3);
    }
    radii.current = r;
    dirs.current = d;
  }, [n]);

  const material = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: HELIO_VERTEX, fragmentShader: HELIO_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color("#4f7cff") }, uIntensity: { value: 0.3 } },
    }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    const r = radii.current, d = dirs.current;
    if (!pts || !r || !d) return;
    const step = sim.current.speed === 0 ? 0 : 6 * Math.min(delta, 0.05); // decorative flow: real time, frozen while paused
    const pos = (pts.geometry.attributes.position as THREE.BufferAttribute);
    const col = (pts.geometry.attributes.color as THREE.BufferAttribute);
    const pa = pos.array as Float32Array, ca = col.array as Float32Array;
    for (let i = 0; i < n; i++) {
      r[i] += step;
      if (r[i] > HELIO_R) r[i] = WIND_R0;
      const k = i * 3;
      pa[k] = d[k] * r[i]; pa[k + 1] = d[k + 1] * r[i]; pa[k + 2] = d[k + 2] * r[i];
      const f = Math.pow(1 - (r[i] - WIND_R0) / (HELIO_R - WIND_R0), 0.8) * 0.7;
      ca[k] = 0.35 * f; ca[k + 1] = 0.65 * f; ca[k + 2] = 1.0 * f;
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false} raycast={() => null}>
        <pointsMaterial map={dot} size={1.8} sizeAttenuation={false} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh raycast={() => null}>
        <sphereGeometry args={[HELIO_R, 48, 24]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  );
}