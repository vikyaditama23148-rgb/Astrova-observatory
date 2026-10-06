"use client";
import { useCallback, useEffect, useState } from "react";

const CREDIT_MS = 5000; // each credit card stays on screen for 5 seconds
const FADE_MS = 900; // fade from the credits into the observatory

const CSS = `
.obs-intro {
  position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 28px;
  background: radial-gradient(ellipse at center, #0a1224 0%, #02030a 70%);
  text-align: center; color: var(--text);
}
.obs-intro.is-leaving { opacity: 0; pointer-events: none; transition: opacity ${FADE_MS}ms ease; }
.obs-credit { max-width: 680px; animation: obsCreditIn ${CREDIT_MS}ms ease-in-out both; }
.obs-credit hr {
  width: min(280px, 60%); height: 1px; margin: 22px auto; border: 0;
  background: linear-gradient(90deg, transparent, var(--accent), transparent); transform-origin: center;
  animation: obsCreditLine 1.2s ease-out 0.4s both;
}
.obs-credit-title { margin: 0; font-size: clamp(1.4rem, 5.4vw, 2.7rem); font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; }
.obs-credit-sub { margin: 10px 0 0; font-size: clamp(0.8rem, 2.4vw, 1rem); letter-spacing: 0.28em; text-transform: uppercase; color: var(--accent); }
.obs-credit-main { margin: 0; font-size: clamp(1rem, 3vw, 1.3rem); line-height: 1.5; }
.obs-credit-small { margin: 6px 0 0; font-size: clamp(0.78rem, 2vw, 0.92rem); line-height: 1.55; color: var(--muted); }
.obs-credit-role { margin: 0 0 8px; font-size: clamp(0.7rem, 1.9vw, 0.82rem); letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); }
.obs-credit-name { margin: 0; font-size: clamp(1.4rem, 5vw, 2.3rem); font-weight: 300; letter-spacing: 0.12em; }
.obs-credit-text { margin: 0; font-size: clamp(0.95rem, 2.6vw, 1.3rem); line-height: 1.8; font-weight: 300; }
.obs-intro-skip {
  position: absolute; right: max(18px, env(safe-area-inset-right)); bottom: max(18px, env(safe-area-inset-bottom));
  min-height: 44px; min-width: 44px; padding: 0 16px; border-radius: 999px; cursor: pointer; font-size: 0.82rem;
  background: rgba(8, 12, 24, 0.6); border: 1px solid var(--line); color: var(--text);
}
@keyframes obsCreditIn {
  0% { opacity: 0; transform: translateY(10px) scale(0.985); }
  14% { opacity: 1; transform: none; }
  86% { opacity: 1; transform: translateY(-4px) scale(1.008); }
  100% { opacity: 0; transform: translateY(-9px) scale(1.012); }
}
@keyframes obsCreditLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;

export function IntroCredits({ onDone }: { onDone: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<0 | 1 | 2>(0); // 0: credit one, 1: credit two, 2: fading out

  // Rendered only after mount so the 5-second CSS animations start together with the timers (not at server paint).
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t1 = window.setTimeout(() => setStage((s) => (s === 2 ? 2 : 1)), CREDIT_MS);
    const t2 = window.setTimeout(() => setStage(2), CREDIT_MS * 2);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [mounted]);

  useEffect(() => {
    if (stage !== 2) return;
    const t = window.setTimeout(onDone, FADE_MS);
    return () => window.clearTimeout(t);
  }, [stage, onDone]);

  const skip = useCallback(() => setStage(2), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip]);

  if (!mounted) return null;

  return (
    <div className={`obs-intro${stage === 2 ? " is-leaving" : ""}`} role="region" aria-label="Kredit pembuka">
      <style>{CSS}</style>

      {stage === 0 && (
        <div className="obs-credit" key="credit-1">
          <p className="obs-credit-title">Astrova Observatory</p>
          <p className="obs-credit-sub">Performa Tinggi</p>
          <hr />
          <p className="obs-credit-main">Solar System Scope Berlisensi CC BY 4.0</p>
          <p className="obs-credit-small">(Creative Commons Attribution 4.0 International)</p>
          <hr />
          <p className="obs-credit-role">Pengembang / Pencipta</p>
          <p className="obs-credit-name">Viky Aditama</p>
          <p className="obs-credit-small">sebagai Project Skripsi S1 Pendidikan Guru Sekolah Dasar</p>
        </div>
      )}

      {stage === 1 && (
        <div className="obs-credit" key="credit-2">
          <p className="obs-credit-text">
            Tekstur planet didasarkan pada data elevasi dan citra dari NASA. Warna dan tekstur disesuaikan dengan foto
            berwarna asli yang diambil oleh wahana antariksa Messenger, Viking, dan Cassini, menggunakan Teleskop
            Luar Angkasa Hubble.
          </p>
        </div>
      )}

      {stage !== 2 && (
        <button type="button" className="obs-intro-skip" onClick={skip}>Lewati ›</button>
      )}
    </div>
  );
}