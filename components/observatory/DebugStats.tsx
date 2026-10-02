"use client";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** Writes FPS / renderer stats into a DOM node (no React state, no re-renders). */
export function DebugStats({ outputId, quality }: { outputId: string; quality: string }) {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const acc = useRef(0);
  useFrame((_, dt) => {
    frames.current++;
    acc.current += dt;
    if (acc.current >= 0.5) {
      const el = document.getElementById(outputId);
      if (el) {
        const i = gl.info;
        const fps = Math.round(frames.current / acc.current);
        el.textContent = `FPS ${fps} · calls ${i.render.calls} · tris ${i.render.triangles} · tex ${i.memory.textures} · geo ${i.memory.geometries} · mode ${quality}`;
      }
      frames.current = 0; acc.current = 0;
    }
  });
  return null;
}
