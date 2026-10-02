"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { INITIAL_VIEW, viewReducer } from "@/lib/camera/states";
import { parseContext } from "@/lib/integration/params";
import { detectCapabilities, type Capabilities } from "@/lib/performance/capabilities";
import { QUALITY, QUALITY_STORAGE_KEY, isQualityChoice, resolveQuality, type QualityChoice } from "@/lib/performance/quality";
import { formatSimTime, type SpeedMultiplier } from "@/lib/simulation/clock";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { FallbackInfo } from "@/components/ui/FallbackInfo";
import { InfoCard } from "@/components/ui/InfoCard";
import { PlanetNav } from "@/components/ui/PlanetNav";
import { QualityMenu } from "@/components/ui/QualityMenu";
import { SimControls } from "@/components/ui/SimControls";
import type { ObservatoryScene, SimState } from "./context";
import type * as THREE from "three";

const ObservatoryCanvas = dynamic(() => import("./ObservatoryCanvas"), { ssr: false });
const PLANET_COUNT = 8;

export function ObservatoryApp() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [choice, setChoice] = useState<QualityChoice>("auto");
  const [view, dispatch] = useReducer(viewReducer, INITIAL_VIEW);
  const [speed, setSpeed] = useState<SpeedMultiplier>(10);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [upgraded, setUpgraded] = useState(0);
  const [debug, setDebug] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);

  const sim = useRef<SimState>({ hours: 0, rotHours: 0, speed: 10, rotationEnabled: true });
  const bodies = useRef(new Map<string, THREE.Object3D>());

  // One-time client setup (deferred a frame: reads browser-only state without a synchronous setState in the effect).
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setCaps(detectCapabilities());
      setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      try {
        const stored = window.localStorage.getItem(QUALITY_STORAGE_KEY);
        if (isQualityChoice(stored)) setChoice(stored);
      } catch { /* storage may be blocked; ignore */ }
      const params = new URLSearchParams(window.location.search);
      const ctx = parseContext(params);
      setReturnTo(ctx.returnTo);
      setDebug(params.get("debug") === "1");
      if (ctx.selectedPlanet) dispatch({ type: "select", planetId: ctx.selectedPlanet });
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "reset" });
      if ((e.key === "d" || e.key === "D") && e.shiftKey && !(e.target instanceof HTMLSelectElement)) setDebug((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cheap DOM update for the sim-time label (no React re-render per frame).
  useEffect(() => {
    const id = window.setInterval(() => {
      const el = document.getElementById("obs-time");
      if (el) el.textContent = formatSimTime(sim.current.hours);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const resolved = caps ? resolveQuality(choice, caps.hints) : "balanced";
  const quality = QUALITY[resolved];

  const changeSpeed = useCallback((s: SpeedMultiplier) => { sim.current.speed = s; setSpeed(s); }, []);
  const toggleRotation = useCallback(() => {
    setRotationEnabled((v) => { sim.current.rotationEnabled = !v; return !v; });
  }, []);
  const changeQuality = useCallback((c: QualityChoice) => {
    setChoice(c);
    try { window.localStorage.setItem(QUALITY_STORAGE_KEY, c); } catch { /* ignore */ }
  }, []);
  const onSelect = useCallback((id: string) => dispatch({ type: "select", planetId: id }), []);
  const onTextureUpgraded = useCallback(() => setUpgraded((n) => Math.min(PLANET_COUNT, n + 1)), []);
  const onReady = useCallback(() => setReady(true), []);

  const scene: ObservatoryScene = useMemo(
    () => ({ sim, bodies, quality, view, reducedMotion, onSelect, onTextureUpgraded }),
    [quality, view, reducedMotion, onSelect, onTextureUpgraded],
  );

  const noWebgl = caps !== null && !caps.webgl;

  return (
    <main className="obs-root">
      <div className="obs-canvas">
        {noWebgl ? (
          <FallbackInfo reason="Peramban atau perangkat ini tidak mendukung WebGL." />
        ) : caps ? (
          <ErrorBoundary fallback={(e) => <FallbackInfo reason={`Terjadi kesalahan saat memuat adegan 3D (${e.message}).`} />}>
            <ObservatoryCanvas scene={scene} qualityLabel={resolved} debug={debug} onReady={onReady} />
          </ErrorBoundary>
        ) : null}
      </div>

      <header className="obs-header">
        <div>
          <h1>ASTROVA OBSERVATORY</h1>
          <p>Jelajahi Tata Surya.</p>
        </div>
        <div className="obs-header-right">
          <span className="obs-badge" title="Ukuran dan jarak dikompresi agar semua benda muat di layar">Visualisasi tidak sesuai skala</span>
          <QualityMenu choice={choice} resolved={resolved} onChange={changeQuality} />
          {returnTo && <a className="obs-return" href={returnTo}>↩ Kembali ke Astrova</a>}
        </div>
      </header>

      {debug && <div id="obs-debug" className="obs-debug" aria-hidden="true">memuat statistik…</div>}

      {view.planetId && (
        <InfoCard
          id={view.planetId}
          mode={view.mode}
          onExplore={() => dispatch({ type: "explore" })}
          onPov={() => view.planetId && dispatch({ type: "pov", planetId: view.planetId })}
          onBack={() => dispatch({ type: "reset" })}
          rotationEnabled={rotationEnabled}
          onToggleRotation={toggleRotation}
        />
      )}

      <footer className="obs-footer">
        <PlanetNav selectedId={view.planetId} onSelect={onSelect} />
        <SimControls speed={speed} onSpeed={changeSpeed} timeLabelId="obs-time" />
        <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--muted)", textAlign: "center" }}>
          <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>Solar System Scope</a>
          {" berlisensi "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>CC BY 4.0</a>
          , berbasis Data NASA
        </p>
      </footer>

      {!ready && !noWebgl && (
        <div className="obs-loading" role="status">
          <div>
            <h2>ASTROVA OBSERVATORY</h2>
            <p>Menyiapkan observatorium…</p>
          </div>
        </div>
      )}
      {ready && upgraded < PLANET_COUNT && (
        <p className="obs-progress" role="status">Menyempurnakan tekstur {upgraded}/{PLANET_COUNT}</p>
      )}
    </main>
  );
}