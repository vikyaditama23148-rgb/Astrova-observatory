"use client";
import { useMemo, useEffect } from "react";
import * as THREE from "three";

const vertex = /* glsl */ `
varying vec3 vNormal; varying vec3 vView;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const fragment = /* glsl */ `
uniform vec3 uColor; uniform float uIntensity;
varying vec3 vNormal; varying vec3 vView;
void main(){
  float f = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
  gl_FragColor = vec4(uColor, f * uIntensity);
}`;

/** Fresnel rim glow rendered on a slightly larger back-face sphere. */
export function Atmosphere({ radius, color, intensity, segments }: { radius: number; color: string; intensity: number; segments: number }) {
  const material = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment,
      uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity } },
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.FrontSide, depthWrite: false,
    }),
    [color, intensity],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh scale={1.12} raycast={() => null}>
      <sphereGeometry args={[radius, Math.max(24, segments / 2), Math.max(16, segments / 3)]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
