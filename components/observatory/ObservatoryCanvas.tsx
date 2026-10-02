"use client";
import { Canvas } from "@react-three/fiber";
import { SolarSystem } from "./SolarSystem";
import { DebugStats } from "./DebugStats";
import { SceneProvider, type ObservatoryScene } from "./context";

export interface CanvasProps {
  scene: ObservatoryScene;
  qualityLabel: string;
  debug: boolean;
  onReady: () => void;
}

export default function ObservatoryCanvas({ scene, qualityLabel, debug, onReady }: CanvasProps) {
  const q = scene.quality;
  return (
    <Canvas
      key={q.antialias ? "aa" : "noaa"}
      dpr={[1, q.maxDpr]}
      camera={{ position: [0, 62, 108], fov: 45, near: 0.05, far: 2000 }}
      gl={{ antialias: q.antialias, powerPreference: "high-performance" }}
      onCreated={onReady}
      aria-label="Tampilan 3D Tata Surya. Gunakan daftar planet di layar untuk memilih tanpa mouse."
    >
      <SceneProvider value={scene}>
        <SolarSystem />
        {debug && <DebugStats outputId="obs-debug" quality={qualityLabel} />}
      </SceneProvider>
    </Canvas>
  );
}
