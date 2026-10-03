"use client";
import { useEffect, useRef, type ComponentRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_BY_ID } from "@/data/planets";
import { FOCUS_DISTANCE_FACTOR } from "@/lib/camera/states";
import { SUN_VISUAL_RADIUS, visualRadius } from "@/lib/rendering/scale";
import { useScene } from "./context";

const DEFAULT_DIR = new THREE.Vector3(0, 0.5, 0.86).normalize();
const DEFAULT_DISTANCE = 125;
const tmpFocus = new THREE.Vector3();

function bodyRadius(id: string | null): number {
  if (id === "sun") return SUN_VISUAL_RADIUS;
  if (id && id in PLANET_BY_ID) return visualRadius(PLANET_BY_ID[id as keyof typeof PLANET_BY_ID]);
  return 1;
}

export function CameraController() {
  const { view, bodies, reducedMotion } = useScene();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const transition = useRef({ active: false, dir: DEFAULT_DIR.clone(), distance: DEFAULT_DISTANCE, elapsed: 0 });
  const lastFocus = useRef(new THREE.Vector3());

  // Start a transition whenever the view state changes.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const t = transition.current;
    const body = view.planetId ? bodies.current.get(view.planetId) : undefined;
    const r = bodyRadius(view.planetId);

    switch (view.mode) {
      case "SOLAR_SYSTEM":
        t.dir.copy(DEFAULT_DIR); t.distance = DEFAULT_DISTANCE;
        c.minDistance = 12; c.maxDistance = 800;
        break;
      case "PLANET_FOCUS":
      case "PLANET_ORBIT":
        t.dir.copy(camera.position).sub(c.target).normalize();
        t.distance = r * FOCUS_DISTANCE_FACTOR[view.mode];
        c.minDistance = r * 1.6; c.maxDistance = r * 14;
        break;
      case "POV_PLANET": {
        // "Space POV": camera beside the planet, offset along its orbital tangent, Sun visible to one side.
        if (body) {
          body.getWorldPosition(tmpFocus);
          const radial = tmpFocus.clone().setY(0).normalize();
          const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
          t.dir.copy(tangent).multiplyScalar(0.94).add(new THREE.Vector3(0, 0.34, 0)).normalize();
        }
        t.distance = r * 4.2;
        c.minDistance = r * 1.6; c.maxDistance = r * 14;
        break;
      }
      case "FREE_SPACE":
        c.minDistance = 4; c.maxDistance = 900;
        t.active = false;
        return;
    }
    t.elapsed = 0;
    t.active = true;
    if (body) body.getWorldPosition(lastFocus.current);
    else lastFocus.current.set(0, 0, 0);
  }, [view, bodies, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || view.mode === "FREE_SPACE") return;
    const body = view.planetId ? bodies.current.get(view.planetId) : undefined;
    if (body) body.getWorldPosition(tmpFocus); else tmpFocus.set(0, 0, 0);

    // Follow the moving body so the camera stays locked while the planet orbits.
    const follow = tmpFocus.clone().sub(lastFocus.current);
    lastFocus.current.copy(tmpFocus);

    const t = transition.current;
    const k = reducedMotion ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 3.2);
    if (t.active) {
      t.elapsed += dt;
      c.target.lerp(tmpFocus, k);
      const desired = c.target.clone().addScaledVector(t.dir, t.distance);
      camera.position.lerp(desired, k);
      if (camera.position.distanceTo(desired) < t.distance * 0.015 && c.target.distanceTo(tmpFocus) < 0.05) t.active = false;
      if (t.elapsed > 6) t.active = false; // safety: never fight the user indefinitely
    } else if (view.planetId) {
      c.target.add(follow);
      camera.position.add(follow);
    }
    c.update();
  });

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} enablePan={false} rotateSpeed={0.6} zoomSpeed={0.8} />;
}