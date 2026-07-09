/**
 * App.jsx — Hydro-Acoustic Passive Sonar Marine Monitoring Console
 *
 * Design: full-bleed photographic hero (real ocean/cargo-ship photography,
 * Unsplash License — free for commercial use) with a moving gradient overlay
 * and subtle parallax, in the register of maritime brand sites like Negmar/CNCE.
 * Transitions into a calm, light instrument-panel console for the actual tool.
 *
 * NOTE: colors here use arbitrary Tailwind values (bg-[#...]) rather than
 * theme extensions, so this renders correctly even if tailwind.config.js
 * hasn't been touched — no dependency on custom color tokens.
 *
 * API: POST http://localhost:8000/api/v1/analyze-hydrophone
 *      Body: FormData { file: <wav File> }
 *      Response: { Container_Ship: float, Marine_Mammal: float }
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Ship, ShieldAlert, AlertTriangle, ArrowRight,
  Upload, FileAudio, Anchor, X, Radio, Waves,
} from 'lucide-react';

const API_ENDPOINT = 'http://localhost:8000/api/v1/analyze-hydrophone';
const STATE = { IDLE: 'IDLE', LOADING: 'LOADING', VESSEL: 'VESSEL', MAMMAL: 'MAMMAL', ERROR: 'ERROR' };

// Real, freely-licensed photography (Unsplash License, no attribution required)
const HERO_IMAGE = 'https://images.unsplash.com/photo-1713127563314-5163b052cf8b?auto=format&fit=crop&w=2400&q=80';

// ─────────────────────────────────────────────────────────────────────────
// Parallax hook — subtle mouse-driven drift on the hero photo
// ─────────────────────────────────────────────────────────────────────────
function useParallax(strength = 14) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * strength;
      const y = (e.clientY / window.innerHeight - 0.5) * strength;
      setOffset({ x, y });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [strength]);
  return offset;
}

// ─────────────────────────────────────────────────────────────────────────
// ProbabilityBar
// ─────────────────────────────────────────────────────────────────────────
function ProbabilityBar({ label, sublabel, value, barClass, textClass, delay = 0 }) {
  const [width, setWidth] = useState(0);
  const pct = (value * 100).toFixed(1);

  useEffect(() => {
    const t = setTimeout(() => setWidth(value * 100), delay + 80);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="space-y-2" style={{ animation: `rise 0.5s ${delay}ms cubic-bezier(.22,1,.36,1) both` }}>
      <div className="flex items-end justify-between">
        <div>
          <p className={`text-sm font-medium ${textClass}`}>{label}</p>
          <p className="text-xs text-[#16211F]/40 mt-0.5">{sublabel}</p>
        </div>
        <span className={`font-data text-lg font-medium tabular-nums ${textClass}`}>
          {pct}<span className="text-xs opacity-50">%</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#16211F]/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="relative w-14 h-14 mx-auto mb-6">
      <div className="absolute inset-0 rounded-full border-2 border-[#BFDAD3]" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1B4A43] animate-spin-cw" />
      <Radio className="absolute inset-0 m-auto w-5 h-5 text-[#1B4A43]" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const [file, setFile]         = useState(null);
  const [uiState, setUiState]   = useState(STATE.IDLE);
  const [scores, setScores]     = useState({ Container_Ship: 0, Marine_Mammal: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef                = useRef(null);
  const consoleRef              = useRef(null);
  const parallax                = useParallax(10);

  const accept = useCallback((f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.wav')) {
      setErrorMsg('Only .wav files are accepted.');
      setUiState(STATE.ERROR);
      return;
    }
    setFile(f);
    setUiState(STATE.IDLE);
    setErrorMsg('');
  }, []);

  const clear = () => {
    setFile(null);
    setUiState(STATE.IDLE);
    setScores({ Container_Ship: 0, Marine_Mammal: 0 });
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const analyse = async () => {
    if (!file) return;
    setUiState(STATE.LOADING);
    setErrorMsg('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res  = await fetch(API_ENDPOINT, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
      const data = await res.json();
      const ship   = data?.Container_Ship  ?? 0;
      const mammal = data?.Marine_Mammal   ?? 0;
      setScores({ Container_Ship: ship, Marine_Mammal: mammal });
      setUiState(mammal > ship ? STATE.MAMMAL : STATE.VESSEL);
    } catch (e) {
      setErrorMsg(e.message || 'Unknown network error.');
      setUiState(STATE.ERROR);
    }
  };

  const loading    = uiState === STATE.LOADING;
  const canAnalyse = !!file && !loading;

  const resultConfig = {
    [STATE.VESSEL]: {
      icon: <Ship className="w-5 h-5 text-[#A9762A]" />,
      badge: 'Vessel detected',
      badgeClass: 'text-[#A9762A] bg-[#C08A2E]/10',
      title: 'Commercial traffic identified',
      desc: 'A low-frequency propeller cavitation signature was isolated from the recording.',
      chipBg: 'bg-[#C08A2E]/10',
    },
    [STATE.MAMMAL]: {
      icon: <ShieldAlert className="w-5 h-5 text-[#2F7A5C]" />,
      badge: 'Mammal detected',
      badgeClass: 'text-[#2F7A5C] bg-[#3F9C77]/10',
      title: 'Cetacean vocalization identified',
      desc: 'A protected marine mammal call was found. Vessel speed reduction is recommended in adjacent lanes.',
      chipBg: 'bg-[#3F9C77]/10',
    },
  };
  const rc = resultConfig[uiState];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#16211F] font-sans">

      {/* ════════════════════════════ HERO — full-bleed photo ════════════════════════════ */}
      <div className="relative h-screen min-h-[640px] overflow-hidden bg-[#071B24]">

        {/* Photo layer, drifting subtly with mouse */}
        <div
          className="absolute inset-[-3%] bg-cover bg-center transition-transform duration-300 ease-out will-change-transform"
          style={{
            backgroundImage: `url(${HERO_IMAGE})`,
            transform: `translate(${parallax.x}px, ${parallax.y}px) scale(1.06)`,
          }}
        />

        {/* Gradient overlays for legibility + mood */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#071B24]/85 via-[#071B24]/55 to-[#071B24]/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071B24] via-transparent to-transparent" />

        {/* Nav */}
        <header className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Anchor className="w-5 h-5 text-white" strokeWidth={2} />
            <span className="text-sm font-semibold tracking-wide text-white">Marine Monitoring Console</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#console" className="hover:text-white transition-colors">Console</a>
            <a
              href="https://github.com/lohith400/Hydro-Acoustic-Passive-Sonar-Marine-Monitoring-Conservation-Console"
              className="hover:text-white transition-colors"
            >
              Source
            </a>
          </nav>
          <button
            onClick={() => consoleRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-1.5 bg-white text-[#071B24] text-sm font-medium pl-4 pr-3 py-2 rounded-full hover:bg-white/90 transition-colors"
          >
            Analyze a recording
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </header>

        {/* Hero copy */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 h-[calc(100%-88px)] flex flex-col justify-center">
          <p className="inline-flex items-center gap-2 text-xs font-data text-[#8FD9C4] tracking-[0.15em] uppercase mb-6">
            <Waves className="w-3.5 h-3.5" />
            Passive sonar, tuned by deep learning
          </p>

          <h1 className="font-display text-5xl md:text-7xl leading-[1.02] text-white max-w-3xl">
            Built for oceans.
            <br />
            <span className="italic text-[#8FD9C4]">Tuned to whales.</span>
          </h1>

          <p className="text-white/65 text-base md:text-lg max-w-xl mt-6 leading-relaxed">
            A hydrophone stream, one waveform, two possible voices — the churn of a
            hull or the call of a whale. This console listens and tells them apart.
          </p>

          <div className="flex flex-wrap items-center gap-5 mt-9">
            <button
              onClick={() => consoleRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 bg-white text-[#071B24] text-sm font-medium pl-5 pr-4 py-3 rounded-full hover:bg-white/90 transition-colors"
            >
              Try the model
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 text-sm text-white/55">
              <div className="flex -space-x-2">
                <span className="w-7 h-7 rounded-full bg-[#A9762A] border-2 border-[#071B24] flex items-center justify-center">
                  <Ship className="w-3.5 h-3.5 text-[#071B24]" />
                </span>
                <span className="w-7 h-7 rounded-full bg-[#2F7A5C] border-2 border-[#071B24] flex items-center justify-center">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#071B24]" />
                </span>
              </div>
              Trained on 1,700+ real hydrophone recordings
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <button
          onClick={() => consoleRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors"
          aria-label="Scroll to console"
        >
          <span className="font-data text-[10px] tracking-[0.2em] uppercase">Scroll</span>
          <span className="w-px h-8 bg-white/30 animate-pulse-glow" />
        </button>
      </div>

      {/* ════════════════════════════ CONSOLE (light, functional register) ════════════════════════════ */}
      <main ref={consoleRef} id="console" className="max-w-5xl mx-auto px-6 md:px-8 py-20">
        <div className="text-center mb-12">
          <p className="font-data text-xs text-[#1B4A43]/70 tracking-[0.2em] uppercase mb-3">
            Hydro-acoustic signal analysis
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-[#16211F] leading-tight">
            Upload a recording,
            <br />
            <span className="italic text-[#1B4A43]">hear what the ocean knows.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT: Upload ── */}
          <div className="flex flex-col gap-4">
            <div
              role="button"
              tabIndex={0}
              aria-label="Click or drag a .wav file to upload"
              onClick={() => !file && inputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && !file && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); accept(e.dataTransfer.files?.[0]); }}
              className={`
                relative flex flex-col items-center justify-center
                rounded-2xl border p-10 text-center
                transition-all duration-200 min-h-[240px]
                ${file
                  ? 'border-[#2F6E64]/30 bg-white cursor-default'
                  : dragOver
                    ? 'border-[#2F6E64]/60 bg-[#EEF5F3] cursor-pointer'
                    : 'border-[#16211F]/12 bg-white hover:border-[#2F6E64]/40 cursor-pointer'
                }
              `}
            >
              <input
                ref={inputRef} type="file" accept=".wav,audio/wav" className="hidden"
                onChange={(e) => accept(e.target.files?.[0])}
              />

              {file ? (
                <div className="w-full animate-rise">
                  <div className="flex items-center gap-3 bg-[#FAF9F5] rounded-xl border border-[#16211F]/10 px-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-[#EEF5F3] flex items-center justify-center flex-shrink-0">
                      <FileAudio className="w-5 h-5 text-[#1B4A43]" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-medium text-[#16211F] truncate">{file.name}</p>
                      <p className="font-data text-xs text-[#16211F]/40 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB · Linear PCM
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clear(); }}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[#16211F]/35 hover:bg-[#C05B3C]/10 hover:text-[#A6472D] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-data text-xs text-[#1B4A43]/60 tracking-wide mt-3">
                    Ready for analysis
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-[#16211F]/25 mb-4" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-[#16211F]/70">Drop a .wav recording here</p>
                  <p className="text-xs text-[#16211F]/40 mt-1">
                    or <span className="text-[#1B4A43] underline underline-offset-2">browse to select</span>
                  </p>
                  <p className="font-data text-[11px] text-[#16211F]/25 mt-6 tracking-wide">
                    Linear PCM · 22.05 kHz · .wav only
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={analyse}
              disabled={!canAnalyse}
              className={`
                w-full flex items-center justify-center gap-2.5
                rounded-2xl py-4 text-sm font-medium
                transition-colors duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6E64] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9F5]
                ${canAnalyse
                  ? 'bg-[#1B4A43] hover:bg-[#0F2E2A] text-[#FAF9F5] cursor-pointer'
                  : 'bg-[#16211F]/6 text-[#16211F]/30 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[#FAF9F5]/30 border-t-[#FAF9F5] animate-spin-cw" />
                  Analysing recording…
                </>
              ) : (
                'Analyze recording'
              )}
            </button>

            {!file && (
              <p className="text-center text-xs text-[#16211F]/35 leading-relaxed">
                The model classifies underwater audio as a
                <span className="text-[#16211F]/55"> commercial vessel</span> or
                <span className="text-[#16211F]/55"> marine mammal</span> signature.
              </p>
            )}
          </div>

          {/* ── RIGHT: Result ── */}
          <div className="relative rounded-2xl border border-[#16211F]/10 bg-white overflow-hidden min-h-[300px] flex flex-col">

            {uiState === STATE.IDLE && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-rise">
                <div className="w-12 h-12 rounded-full bg-[#FAF9F5] border border-[#16211F]/10 flex items-center justify-center mb-5">
                  <Radio className="w-5 h-5 text-[#16211F]/30" />
                </div>
                <p className="text-xs font-data text-[#16211F]/35 tracking-wide mb-2 uppercase">
                  Awaiting recording
                </p>
                <p className="text-sm text-[#16211F]/40 leading-relaxed">
                  Select a .wav file and analyze it<br />to see the classification here.
                </p>
              </div>
            )}

            {uiState === STATE.LOADING && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-rise">
                <Spinner />
                <p className="text-xs font-data text-[#1B4A43] tracking-wide mb-2 uppercase">
                  Processing
                </p>
                <p className="text-sm text-[#16211F]/40 leading-relaxed">
                  Computing the log-mel spectrogram<br />and running it through the model…
                </p>
              </div>
            )}

            {(uiState === STATE.VESSEL || uiState === STATE.MAMMAL) && rc && (
              <div className="flex-1 flex flex-col p-8 animate-rise">
                <div className="flex items-start gap-4 mb-8">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${rc.chipBg}`}>
                    {rc.icon}
                  </div>
                  <div>
                    <span className={`font-data text-xs tracking-wide uppercase px-2.5 py-1 rounded-full inline-block mb-2 ${rc.badgeClass}`}>
                      {rc.badge}
                    </span>
                    <h3 className="font-display text-lg text-[#16211F] leading-tight">
                      {rc.title}
                    </h3>
                    <p className="text-sm text-[#16211F]/45 mt-1.5 leading-relaxed">{rc.desc}</p>
                  </div>
                </div>

                <div className="space-y-6 mt-auto pt-6 border-t border-[#16211F]/8">
                  {uiState === STATE.VESSEL ? (
                    <>
                      <ProbabilityBar
                        label="Container ship" sublabel="Propeller cavitation signature"
                        value={scores.Container_Ship}
                        barClass="bg-[#A9762A]" textClass="text-[#A9762A]" delay={0}
                      />
                      <ProbabilityBar
                        label="Marine mammal" sublabel="Cetacean vocalization"
                        value={scores.Marine_Mammal}
                        barClass="bg-[#2F7A5C]/60" textClass="text-[#16211F]/40" delay={140}
                      />
                    </>
                  ) : (
                    <>
                      <ProbabilityBar
                        label="Marine mammal" sublabel="Cetacean vocalization"
                        value={scores.Marine_Mammal}
                        barClass="bg-[#2F7A5C]" textClass="text-[#2F7A5C]" delay={0}
                      />
                      <ProbabilityBar
                        label="Container ship" sublabel="Propeller cavitation signature"
                        value={scores.Container_Ship}
                        barClass="bg-[#A9762A]/60" textClass="text-[#16211F]/40" delay={140}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {uiState === STATE.ERROR && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-rise">
                <div className="w-11 h-11 rounded-xl bg-[#C05B3C]/10 flex items-center justify-center mb-5">
                  <AlertTriangle className="w-5 h-5 text-[#A6472D]" />
                </div>
                <p className="text-xs font-data text-[#A6472D] tracking-wide mb-2 uppercase">
                  Analysis failed
                </p>
                <p className="text-sm text-[#16211F]/45 leading-relaxed mb-4">
                  {errorMsg || 'Could not reach the inference backend.'}
                </p>
                <p className="font-data text-xs text-[#16211F]/30">
                  Make sure <span className="text-[#16211F]/50">main.py</span> is running on port 8000
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-[#16211F]/8 flex flex-col sm:flex-row gap-2 items-center justify-between text-center sm:text-left">
          <p className="font-data text-xs text-[#16211F]/35">
            DeepShip · Watkins Marine Mammal Database · TensorFlow
          </p>
          <p className="font-data text-xs text-[#16211F]/35">
            2D-CNN · 128×128 log-mel spectrogram · 22.05 kHz
          </p>
        </div>
      </main>
    </div>
  );
}