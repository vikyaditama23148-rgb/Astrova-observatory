"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { INITIAL_VIEW, viewReducer } from "@/lib/camera/states";
import { MAIN_SITE_LOGIN_URL, MAIN_SITE_ORIGIN, parseContext } from "@/lib/integration/params";
import { detectCapabilities, type Capabilities } from "@/lib/performance/capabilities";
import { QUALITY, QUALITY_STORAGE_KEY, isQualityChoice, resolveQuality, type QualityChoice } from "@/lib/performance/quality";
import { formatSimTime, type SpeedMultiplier } from "@/lib/simulation/clock";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { FallbackInfo } from "@/components/ui/FallbackInfo";
import { InfoCard } from "@/components/ui/InfoCard";
import { IntroCredits } from "@/components/ui/IntroCredits";
import { LayerMenu } from "@/components/ui/LayerMenu";
import { PlanetNav } from "@/components/ui/PlanetNav";
import { QualityHint } from "@/components/ui/QualityHint";
import { QualityMenu } from "@/components/ui/QualityMenu";
import { SimControls } from "@/components/ui/SimControls";
import { DEFAULT_LAYERS, type Layers, type ObservatoryScene, type SimState } from "./context";
import type * as THREE from "three";

const ObservatoryCanvas = dynamic(() => import("./ObservatoryCanvas"), { ssr: false });
const PLANET_COUNT = 8;
const HINT_DISMISSED_KEY = "astrova-observatory:quality-hint-dismissed";
const HINT_COUNT_KEY = "astrova-observatory:quality-hint-count";
const HINT_MAX_SHOWS = 3; // the hint appears on at most this many visits unless the user dismisses it earlier
const HINT_DELAY_MS = 5000;

export function ObservatoryApp() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [choice, setChoice] = useState<QualityChoice>("auto");
  const [view, dispatch] = useReducer(viewReducer, INITIAL_VIEW);
  const [speed, setSpeed] = useState<SpeedMultiplier>(10);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [upgraded, setUpgraded] = useState(0);
  const [debug, setDebug] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [hintEligible, setHintEligible] = useState(false); // from storage: not dismissed and not shown too many times
  const [hintDelay, setHintDelay] = useState(false);
  const [hintClosed, setHintClosed] = useState(false); // closed during this visit
  const [introDone, setIntroDone] = useState(false); // opening credits; add ?intro=0 to the URL to skip them

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
      try {
        const dismissed = window.localStorage.getItem(HINT_DISMISSED_KEY) === "1";
        const shown = parseInt(window.localStorage.getItem(HINT_COUNT_KEY) ?? "0", 10) || 0;
        setHintEligible(!dismissed && shown < HINT_MAX_SHOWS);
      } catch { setHintEligible(true); }
      const params = new URLSearchParams(window.location.search);
      const ctx = parseContext(params);
      setReturnTo(ctx.returnTo);
      setDebug(params.get("debug") === "1");
      if (params.get("intro") === "0") setIntroDone(true);
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
  const noWebgl = caps !== null && !caps.webgl;

  // Quality hint: only for people on automatic quality whose level can still go up, a few seconds after the scene is ready.
  useEffect(() => {
    if (!ready || !introDone) return; // never show the hint over the opening credits
    const id = window.setTimeout(() => setHintDelay(true), HINT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [ready, introDone]);
  const showHint = hintEligible && hintDelay && !hintClosed && !noWebgl && choice === "auto" && (resolved === "performance" || resolved === "balanced");
  useEffect(() => {
    if (!showHint) return;
    try {
      const n = parseInt(window.localStorage.getItem(HINT_COUNT_KEY) ?? "0", 10) || 0;
      window.localStorage.setItem(HINT_COUNT_KEY, String(n + 1));
    } catch { /* ignore */ }
  }, [showHint]);
  const dismissHint = useCallback(() => {
    try { window.localStorage.setItem(HINT_DISMISSED_KEY, "1"); } catch { /* ignore */ }
    setHintClosed(true);
  }, []);
  const autoHideHint = useCallback(() => setHintClosed(true), []);
  const openQualityMenu = useCallback(() => {
    dismissHint();
    const el = document.getElementById("obs-quality-select") as (HTMLSelectElement & { showPicker?: () => void }) | null;
    if (!el) return;
    el.focus();
    el.classList.add("obs-pulse");
    window.setTimeout(() => el.classList.remove("obs-pulse"), 3500);
    try { el.showPicker?.(); } catch { /* not supported or no user activation; the highlight still shows */ }
  }, [dismissHint]);

  const changeSpeed = useCallback((s: SpeedMultiplier) => { sim.current.speed = s; setSpeed(s); }, []);
  const toggleRotation = useCallback(() => {
    const next = !sim.current.rotationEnabled;
    sim.current.rotationEnabled = next;
    setRotationEnabled(next);
  }, []);
  const resetTime = useCallback(() => {
    // Hours = 0 puts every planet (and the Moon / asteroids) back at its starting phase; speed and pause state are kept.
    sim.current.hours = 0;
    sim.current.rotHours = 0;
    const el = document.getElementById("obs-time");
    if (el) el.textContent = formatSimTime(0);
  }, []);
  const toggleLayer = useCallback((key: keyof Layers) => setLayers((l) => ({ ...l, [key]: !l[key] })), []);
  const changeQuality = useCallback((c: QualityChoice) => {
    setChoice(c);
    try { window.localStorage.setItem(QUALITY_STORAGE_KEY, c); } catch { /* ignore */ }
    try { window.localStorage.setItem(HINT_DISMISSED_KEY, "1"); } catch { /* ignore */ } // they found the setting
    setHintClosed(true);
  }, []);
  const onSelect = useCallback((id: string) => dispatch({ type: "select", planetId: id }), []);
  const onTextureUpgraded = useCallback(() => setUpgraded((n) => Math.min(PLANET_COUNT, n + 1)), []);
  const onReady = useCallback(() => setReady(true), []);

  const scene: ObservatoryScene = useMemo(
    () => ({ sim, bodies, quality, view, reducedMotion, onSelect, onTextureUpgraded, layers }),
    [quality, view, reducedMotion, onSelect, onTextureUpgraded, layers],
  );

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
          {view.planetId ? (
            <button
              type="button"
              onClick={() => dispatch({ type: "reset" })}
              style={{ marginTop: 4, minHeight: 36, padding: "0 14px", borderRadius: 999, border: "1px solid var(--accent)", background: "var(--panel)", color: "var(--text)", fontSize: "0.8rem", cursor: "pointer", backdropFilter: "blur(6px)", whiteSpace: "nowrap" }}
            >
              ← Kembali ke Tata Surya
            </button>
          ) : (
            <p>Jelajahi Tata Surya.</p>
          )}
        </div>
        <div className="obs-header-right" style={{ flexWrap: "nowrap" }}>
          <span className="obs-badge" title="Ukuran dan jarak dikompresi agar semua benda muat di layar">Visualisasi tidak sesuai skala</span>
          <QualityMenu choice={choice} resolved={resolved} onChange={changeQuality} />
          <a className="obs-return" style={{ whiteSpace: "nowrap", flex: "none" }} href={returnTo ?? MAIN_SITE_LOGIN_URL}>↩ Kembali ke Astrova</a>
        </div>
      </header>

      {debug && <div id="obs-debug" className="obs-debug" aria-hidden="true">memuat statistik…</div>}

      {view.planetId && (
        <InfoCard id={view.planetId} rotationEnabled={rotationEnabled} onToggleRotation={toggleRotation} />
      )}

      <LayerMenu layers={layers} onToggle={toggleLayer} />

      {showHint && (resolved === "performance" || resolved === "balanced") && (
        <QualityHint level={resolved} onOpenMenu={openQualityMenu} onDismiss={dismissHint} onAutoHide={autoHideHint} />
      )}

      <footer className="obs-footer">
        <PlanetNav selectedId={view.planetId} onSelect={onSelect} />
        <SimControls speed={speed} onSpeed={changeSpeed} onReset={resetTime} timeLabelId="obs-time" />
        <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--muted)", textAlign: "center" }}>
          Astrova Observatory dikembangkan oleh Viky Aditama, bagian dari{" "}
          <a href={MAIN_SITE_ORIGIN} style={{ color: "inherit" }}>Astrova</a>.
        </p>
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
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 40,
            width: "min(280px, calc(100% - 48px))", padding: "14px 18px", textAlign: "center", pointerEvents: "none",
            background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, backdropFilter: "blur(8px)",
          }}
        >
          <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "var(--text)" }}>
            Menyempurnakan tekstur {upgraded}/{PLANET_COUNT}
          </p>
          <div style={{ height: 4, borderRadius: 999, background: "rgba(127, 208, 255, 0.18)", overflow: "hidden" }}>
            <div style={{ width: `${(upgraded / PLANET_COUNT) * 100}%`, height: "100%", background: "var(--accent)", transition: "width 0.3s ease" }} />
          </div>
        </div>
      )}
      {!introDone && <IntroCredits onDone={() => setIntroDone(true)} />}
    </main>
  );
}