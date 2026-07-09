/**
 * App.jsx — Hydro-Acoustic Passive Sonar Marine Monitoring & Conservation Console
 *
 * Design: Clean ocean-deep blue. Breathable. Only essential info.
 * Inspired by: Voyah maritime brand + Metalloinvest aerial aesthetic.
 *
 * State Machine:
 *   IDLE    → File not yet analysed — sonar placeholder
 *   LOADING → POST in-flight — ring spinner
 *   VESSEL  → Container_Ship dominant — amber result
 *   MAMMAL  → Marine_Mammal dominant — emerald result
 *   ERROR   → Network / parse failure — rose alert
 *
 * API: POST http://localhost:8000/api/v1/analyze-hydrophone
 *      Body: FormData { file: <wav File> }
 *      Response: { Container_Ship: float, Marine_Mammal: float }
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Waves, Ship, ShieldAlert, AlertTriangle,
  Upload, FileAudio, Activity, Anchor, X,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_ENDPOINT = 'http://localhost:8000/api/v1/analyze-hydrophone';
const STATE = { IDLE: 'IDLE', LOADING: 'LOADING', VESSEL: 'VESSEL', MAMMAL: 'MAMMAL', ERROR: 'ERROR' };

// ─────────────────────────────────────────────────────────────────────────────
// ProbabilityBar — animated gradient track with a precision label
// ─────────────────────────────────────────────────────────────────────────────
function ProbabilityBar({ label, sublabel, value, barClass, labelClass, delay = 0 }) {
  const [width, setWidth] = useState(0);
  const pct = (value * 100).toFixed(1);

  useEffect(() => {
    const t = setTimeout(() => setWidth(value * 100), delay + 60);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="space-y-2" style={{ animation: `rise 0.5s ${delay}ms cubic-bezier(.22,1,.36,1) both` }}>
      <div className="flex items-end justify-between">
        <div>
          <p className={`text-xs font-semibold tracking-wide ${labelClass}`}>{label}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{sublabel}</p>
        </div>
        <span className={`font-mono-data text-xl font-bold tabular-nums ${labelClass}`}>
          {pct}<span className="text-sm font-normal opacity-60">%</span>
        </span>
      </div>
      {/* Track */}
      <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SonarRing — decorative idle animation
// ─────────────────────────────────────────────────────────────────────────────
function SonarRing() {
  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-6">
      <div className="absolute inset-0 rounded-full border border-cyan-400/10 animate-sonar" />
      <div className="absolute inset-0 rounded-full border border-cyan-400/8 animate-sonar" style={{ animationDelay: '0.9s' }} />
      <div className="absolute inset-3 rounded-full border border-cyan-400/12" />
      <div className="absolute inset-6 rounded-full border border-cyan-400/18" />
      <Waves className="w-8 h-8 text-cyan-400/50" strokeWidth={1.2} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spinner — used in LOADING state
// ─────────────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="relative w-16 h-16 mx-auto mb-6">
      <svg className="absolute inset-0 w-full h-full animate-spin-cw" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" stroke="rgba(34,211,238,0.08)" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="28" stroke="url(#grad-a)" strokeWidth="1.5"
          strokeDasharray="120 56" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad-a" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <svg className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] animate-spin-ccw" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="16" stroke="rgba(34,211,238,0.06)" strokeWidth="1" />
        <circle cx="20" cy="20" r="16" stroke="url(#grad-b)" strokeWidth="1"
          strokeDasharray="40 60" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad-b" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#06b6d4" stopOpacity="0.7" />
            <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <Activity className="absolute inset-0 m-auto w-5 h-5 text-cyan-400/70" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [file, setFile]         = useState(null);
  const [uiState, setUiState]   = useState(STATE.IDLE);
  const [scores, setScores]     = useState({ Container_Ship: 0, Marine_Mammal: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef                = useRef(null);

  // ── File handling ──
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

  // ── Analysis ──
  const analyse = async () => {
    if (!file) return;
    setUiState(STATE.LOADING);
    setErrorMsg('');
    try {
      const form = new FormData();
      form.append('file', file);          // key must be exactly "file"
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

  // ── Result panel config by state ──
  const resultConfig = {
    [STATE.VESSEL]: {
      icon: <Ship  className="w-6 h-6 text-amber-400" />,
      badge: 'VESSEL DETECTED',
      badgeClass: 'text-amber-400 border-amber-400/30 bg-amber-400/8',
      title: 'Commercial Traffic Detected',
      desc: 'Low-frequency propeller cavitation signature isolated and logged to regional maritime grid.',
      accentBg: 'bg-amber-400/5',
      accentBorder: 'border-amber-400/12',
    },
    [STATE.MAMMAL]: {
      icon: <ShieldAlert className="w-6 h-6 text-emerald-400" />,
      badge: 'MAMMAL DETECTED',
      badgeClass: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/8',
      title: 'Ecological Proximity Alert',
      desc: 'Protected cetacean vocalization identified. Speed reduction to 10 knots mandated in adjacent lanes.',
      accentBg: 'bg-emerald-400/5',
      accentBorder: 'border-emerald-400/12',
    },
  };
  const rc = resultConfig[uiState];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans"
      style={{ background: 'linear-gradient(160deg, #0c1e3a 0%, #081628 40%, #051020 100%)' }}>

      {/* ── Ambient background glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-20 animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, #1a4a7a 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-15 animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, #0e3d5c 0%, transparent 70%)', animationDelay: '1.5s' }} />
      </div>

      {/* ════════════════════════════
          HEADER
      ════════════════════════════ */}
      <header className="relative border-b border-white/6">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
          {/* Logo + Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
              <Anchor className="w-4 h-4 text-cyan-400" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[13px] font-semibold tracking-[0.2em] text-white/90 uppercase">
                Marine Monitoring Console
              </h1>
              <p className="text-[10px] text-white/25 tracking-widest mt-0.5">
                Passive Sonar · Cetacean Protection · Vessel Tracking
              </p>
            </div>
          </div>
          {/* Live status */}
          <div className="flex items-center gap-2 text-[10px] font-mono-data text-cyan-400/70 tracking-widest uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
            </span>
            CNN Node Operational
          </div>
        </div>
      </header>

      {/* ════════════════════════════
          MAIN CONTENT
      ════════════════════════════ */}
      <main className="relative max-w-5xl mx-auto px-8 py-16">

        {/* Page title block */}
        <div className="mb-14 text-center">
          <p className="text-[11px] font-mono-data text-cyan-400/50 tracking-[0.3em] uppercase mb-3">
            Hydro-Acoustic Signal Analysis
          </p>
          <h2 className="text-3xl font-light text-white/80 tracking-tight leading-snug">
            Upload a hydrophone recording
            <br />
            <span className="text-white font-semibold">to identify acoustic signatures.</span>
          </h2>
        </div>

        {/* Two-column card grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ─────────────────────────
              LEFT — Upload + Trigger
          ───────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Drop zone */}
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
                rounded-2xl border-2 border-dashed p-10 text-center
                transition-all duration-250 cursor-pointer select-none min-h-[220px]
                ${file
                  ? 'border-cyan-500/25 bg-cyan-500/4 cursor-default'
                  : dragOver
                    ? 'border-cyan-400/50 bg-cyan-400/6 scale-[1.01]'
                    : 'border-white/10 bg-white/2 hover:border-cyan-500/30 hover:bg-cyan-500/3'
                }
              `}
            >
              <input ref={inputRef} type="file" accept=".wav,audio/wav" className="hidden" id="wav-input"
                onChange={(e) => accept(e.target.files?.[0])} />

              {file ? (
                /* File staged */
                <div className="w-full animate-rise">
                  <div className="flex items-center gap-3 bg-white/4 rounded-xl border border-white/8 px-4 py-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/12 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <FileAudio className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-medium text-white/80 truncate">{file.name}</p>
                      <p className="font-mono-data text-[10px] text-white/30 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB · Linear PCM
                      </p>
                    </div>
                    <button
                      id="clear-btn"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clear(); }}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-rose-400/15 text-white/30 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-mono-data text-[10px] text-cyan-500/40 tracking-widest mt-3 uppercase">
                    Ready for inference
                  </p>
                </div>
              ) : (
                /* Empty */
                <>
                  <Upload className="w-8 h-8 text-white/20 mb-4" />
                  <p className="text-sm font-medium text-white/50">Drop a .wav file here</p>
                  <p className="text-xs text-white/25 mt-1">
                    or <span className="text-cyan-400/70 hover:text-cyan-400 transition-colors">browse to select</span>
                  </p>
                  <p className="font-mono-data text-[9px] text-white/15 mt-5 tracking-widest uppercase">
                    Linear PCM · 22.05 kHz · .wav only
                  </p>
                </>
              )}
            </div>

            {/* Analyse button */}
            <button
              id="analyse-btn"
              type="button"
              onClick={analyse}
              disabled={!canAnalyse}
              className={`
                relative w-full flex items-center justify-center gap-2.5
                rounded-2xl py-4 text-[11px] font-semibold tracking-[0.2em] uppercase
                transition-all duration-250 border overflow-hidden
                focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-2 focus:ring-offset-[#081628]
                ${canAnalyse
                  ? 'bg-cyan-500/12 hover:bg-cyan-500/20 active:bg-cyan-500/28 text-cyan-300 border-cyan-500/25 hover:border-cyan-400/40 cursor-pointer shadow-[0_0_32px_rgba(34,211,238,0.07)] hover:shadow-[0_0_48px_rgba(34,211,238,0.14)]'
                  : 'bg-white/3 text-white/20 border-white/6 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-cyan-400/25 border-t-cyan-400 animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Initialize Hydrophone Analysis
                </>
              )}
            </button>

            {/* Hint text */}
            {!file && (
              <p className="text-center text-[11px] text-white/20 leading-relaxed">
                The model classifies underwater audio into<br />
                <span className="text-white/35">commercial vessel</span> or <span className="text-white/35">marine mammal</span> signatures.
              </p>
            )}
          </div>

          {/* ─────────────────────────
              RIGHT — Result Panel
          ───────────────────────── */}
          <div
            className={`
              relative rounded-2xl border overflow-hidden min-h-[300px] flex flex-col
              ${uiState === STATE.VESSEL ? 'border-amber-400/15 bg-amber-400/3'
              : uiState === STATE.MAMMAL ? 'border-emerald-400/15 bg-emerald-400/3'
              : uiState === STATE.ERROR  ? 'border-rose-400/15 bg-rose-400/3'
              : 'border-white/6 bg-white/2'}
            `}
          >

            {/* ── IDLE ── */}
            {uiState === STATE.IDLE && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-rise">
                <SonarRing />
                <p className="text-[10px] font-mono-data text-white/20 tracking-[0.2em] uppercase mb-2">
                  Awaiting Input
                </p>
                <p className="text-sm text-white/30 leading-relaxed">
                  Select a .wav recording and click<br />Analyse to process telemetry.
                </p>
              </div>
            )}

            {/* ── LOADING ── */}
            {uiState === STATE.LOADING && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-rise">
                <Spinner />
                <p className="text-[10px] font-mono-data text-cyan-400/50 tracking-[0.2em] uppercase mb-2">
                  Processing
                </p>
                <p className="text-sm text-white/35 leading-relaxed">
                  Computing STFT &amp; Log-Mel<br />spectrogram matrix tensors…
                </p>
              </div>
            )}

            {/* ── VESSEL or MAMMAL ── */}
            {(uiState === STATE.VESSEL || uiState === STATE.MAMMAL) && rc && (
              <div className="flex-1 flex flex-col p-8 animate-rise">
                {/* Header */}
                <div className="flex items-start gap-4 mb-8">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${rc.accentBg} ${rc.accentBorder}`}>
                    {rc.icon}
                  </div>
                  <div>
                    <span className={`font-mono-data text-[10px] tracking-[0.18em] uppercase px-2.5 py-0.5 rounded-full border ${rc.badgeClass} inline-block mb-1.5`}>
                      {rc.badge}
                    </span>
                    <h3 className="text-base font-semibold text-white/85 leading-tight">
                      {rc.title}
                    </h3>
                    <p className="text-xs text-white/35 mt-1 leading-relaxed">{rc.desc}</p>
                  </div>
                </div>

                {/* Probability bars */}
                <div className="space-y-6 mt-auto">
                  {uiState === STATE.VESSEL ? (
                    <>
                      <ProbabilityBar
                        label="Container Ship"
                        sublabel="Propeller cavitation signature"
                        value={scores.Container_Ship}
                        barClass="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400"
                        labelClass="text-amber-400"
                        delay={0}
                      />
                      <ProbabilityBar
                        label="Marine Mammal"
                        sublabel="Cetacean vocalization"
                        value={scores.Marine_Mammal}
                        barClass="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400"
                        labelClass="text-emerald-400/70"
                        delay={140}
                      />
                    </>
                  ) : (
                    <>
                      <ProbabilityBar
                        label="Marine Mammal"
                        sublabel="Cetacean vocalization"
                        value={scores.Marine_Mammal}
                        barClass="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400"
                        labelClass="text-emerald-400"
                        delay={0}
                      />
                      <ProbabilityBar
                        label="Container Ship"
                        sublabel="Propeller cavitation signature"
                        value={scores.Container_Ship}
                        barClass="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400"
                        labelClass="text-amber-400/70"
                        delay={140}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── ERROR ── */}
            {uiState === STATE.ERROR && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-rise">
                <div className="w-11 h-11 rounded-xl bg-rose-400/8 border border-rose-400/20 flex items-center justify-center mb-5">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <p className="text-[10px] font-mono-data text-rose-400/60 tracking-[0.2em] uppercase mb-2">
                  Inference Error
                </p>
                <p className="text-sm text-white/40 leading-relaxed mb-4">
                  {errorMsg || 'Could not reach the inference backend.'}
                </p>
                <p className="font-mono-data text-[10px] text-white/20">
                  Ensure <span className="text-white/35">main.py</span> is running on port 8000
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Bottom info strip */}
        <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
          <p className="font-mono-data text-[10px] text-white/15 tracking-widest uppercase">
            DeepShip · Watkins DB · TensorFlow 2.21
          </p>
          <p className="font-mono-data text-[10px] text-white/15 tracking-widest uppercase">
            2D-CNN · 128 × 128 Log-Mel · 22.05 kHz
          </p>
        </div>

      </main>
    </div>
  );
}
