/**
 * App.jsx — Hydro-Acoustic Passive Sonar Marine Monitoring Console
 *
 * Design: Daylight marine research console. Paper-white, deep teal ink,
 * brass for vessel signal, sea-glass for mammal signal. Quiet, precise,
 * built like an instrument panel rather than a sci-fi terminal.
 *
 * API: POST http://localhost:8000/api/v1/analyze-hydrophone
 *      Body: FormData { file: <wav File> }
 *      Response: { Container_Ship: float, Marine_Mammal: float }
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Ship, ShieldAlert, AlertTriangle,
  Upload, FileAudio, Anchor, X, Radio,
} from 'lucide-react';

const API_ENDPOINT = 'http://localhost:8000/api/v1/analyze-hydrophone';
const STATE = { IDLE: 'IDLE', LOADING: 'LOADING', VESSEL: 'VESSEL', MAMMAL: 'MAMMAL', ERROR: 'ERROR' };

// ─────────────────────────────────────────────────────────────────────────
// Waveform — signature element. A hand-drawn-feeling acoustic trace that
// sits under the hero headline. Idle: gentle ambient drift. Loading: tighter
// oscillation. Result: settles and colors itself by class.
// ─────────────────────────────────────────────────────────────────────────
function Waveform({ mode = 'idle', tint = '#1B4A43' }) {
  // A single hand-tuned path reused across states, only color/opacity change
  const path =
    "M0,40 C20,40 25,15 45,15 C65,15 68,60 90,60 C112,60 116,10 140,10 " +
    "C164,10 168,55 190,55 C212,55 215,25 240,25 C265,25 268,50 292,50 " +
    "C316,50 320,20 344,20 C368,20 372,58 396,58 C420,58 424,12 448,12 " +
    "C472,12 476,48 500,48 C524,48 528,30 552,30 C576,30 580,40 600,40";

  return (
    <svg viewBox="0 0 600 80" className="w-full h-16 md:h-20" preserveAspectRatio="none">
      <path
        d={path}
        fill="none"
        stroke={tint}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={mode === 'loading' ? 0.85 : 0.35}
        className={mode === 'loading' ? '' : 'animate-drift'}
      />
    </svg>
  );
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
          <p className="text-xs text-ink/40 mt-0.5">{sublabel}</p>
        </div>
        <span className={`font-data text-lg font-medium tabular-nums ${textClass}`}>
          {pct}<span className="text-xs opacity-50">%</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-ink/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="relative w-14 h-14 mx-auto mb-6">
      <div className="absolute inset-0 rounded-full border-2 border-teal-200" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-teal-700 animate-spin-cw" />
      <Radio className="absolute inset-0 m-auto w-5 h-5 text-teal-700" />
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
      icon: <Ship className="w-5 h-5 text-brass-500" />,
      badge: 'Vessel detected',
      badgeClass: 'text-brass-500 bg-brass-400/10',
      title: 'Commercial traffic identified',
      desc: 'A low-frequency propeller cavitation signature was isolated from the recording.',
      chipBg: 'bg-brass-400/10',
      waveTint: '#A9762A',
    },
    [STATE.MAMMAL]: {
      icon: <ShieldAlert className="w-5 h-5 text-seaglass-500" />,
      badge: 'Mammal detected',
      badgeClass: 'text-seaglass-500 bg-seaglass-400/10',
      title: 'Cetacean vocalization identified',
      desc: 'A protected marine mammal call was found. Vessel speed reduction is recommended in adjacent lanes.',
      chipBg: 'bg-seaglass-400/10',
      waveTint: '#2F7A5C',
    },
  };
  const rc = resultConfig[uiState];

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">

      {/* ════════════════════════════ HEADER ════════════════════════════ */}
      <header className="border-b border-ink/8">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center">
              <Anchor className="w-4 h-4 text-paper" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-ink">
                Marine Monitoring Console
              </h1>
              <p className="text-xs text-ink/45 mt-0.5">
                Passive sonar · Cetacean protection · Vessel tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-data text-teal-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-teal-500 animate-ripple" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-700" />
            </span>
            Model online
          </div>
        </div>
      </header>

      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 md:px-8 pt-16 pb-6 text-center">
        <p className="font-data text-xs text-teal-700/70 tracking-[0.2em] uppercase mb-4">
          Hydro-acoustic signal analysis
        </p>
        <h2 className="font-display text-4xl md:text-5xl leading-tight text-ink">
          Listen to the ocean,
          <br />
          <span className="italic text-teal-700">tell ships from whales.</span>
        </h2>
        <div className="max-w-xl mx-auto mt-10">
          <Waveform mode={loading ? 'loading' : 'idle'} tint={rc?.waveTint ?? '#1B4A43'} />
        </div>
      </section>

      {/* ════════════════════════════ WORKSPACE ════════════════════════════ */}
      <main className="max-w-5xl mx-auto px-6 md:px-8 pb-20">
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
                  ? 'border-teal-500/30 bg-white cursor-default'
                  : dragOver
                    ? 'border-teal-500/60 bg-teal-50 cursor-pointer'
                    : 'border-ink/12 bg-white hover:border-teal-500/40 cursor-pointer'
                }
              `}
            >
              <input
                ref={inputRef} type="file" accept=".wav,audio/wav" className="hidden"
                onChange={(e) => accept(e.target.files?.[0])}
              />

              {file ? (
                <div className="w-full animate-rise">
                  <div className="flex items-center gap-3 bg-paper rounded-xl border border-ink/10 px-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <FileAudio className="w-5 h-5 text-teal-700" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-medium text-ink truncate">{file.name}</p>
                      <p className="font-data text-xs text-ink/40 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB · Linear PCM
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clear(); }}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-ink/35 hover:bg-rust-400/10 hover:text-rust-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-data text-xs text-teal-700/60 tracking-wide mt-3">
                    Ready for analysis
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-ink/25 mb-4" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-ink/70">Drop a .wav recording here</p>
                  <p className="text-xs text-ink/40 mt-1">
                    or <span className="text-teal-700 underline underline-offset-2">browse to select</span>
                  </p>
                  <p className="font-data text-[11px] text-ink/25 mt-6 tracking-wide">
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
                focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper
                ${canAnalyse
                  ? 'bg-teal-700 hover:bg-teal-900 text-paper cursor-pointer'
                  : 'bg-ink/6 text-ink/30 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-paper/30 border-t-paper animate-spin-cw" />
                  Analysing recording…
                </>
              ) : (
                'Analyze recording'
              )}
            </button>

            {!file && (
              <p className="text-center text-xs text-ink/35 leading-relaxed">
                The model classifies underwater audio as a
                <span className="text-ink/55"> commercial vessel</span> or
                <span className="text-ink/55"> marine mammal</span> signature.
              </p>
            )}
          </div>

          {/* ── RIGHT: Result ── */}
          <div className="relative rounded-2xl border border-ink/10 bg-white overflow-hidden min-h-[300px] flex flex-col">

            {uiState === STATE.IDLE && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-rise">
                <div className="w-12 h-12 rounded-full bg-paper border border-ink/10 flex items-center justify-center mb-5">
                  <Radio className="w-5 h-5 text-ink/30" />
                </div>
                <p className="text-xs font-data text-ink/35 tracking-wide mb-2 uppercase">
                  Awaiting recording
                </p>
                <p className="text-sm text-ink/40 leading-relaxed">
                  Select a .wav file and analyze it<br />to see the classification here.
                </p>
              </div>
            )}

            {uiState === STATE.LOADING && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-rise">
                <Spinner />
                <p className="text-xs font-data text-teal-700 tracking-wide mb-2 uppercase">
                  Processing
                </p>
                <p className="text-sm text-ink/40 leading-relaxed">
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
                    <h3 className="font-display text-lg text-ink leading-tight">
                      {rc.title}
                    </h3>
                    <p className="text-sm text-ink/45 mt-1.5 leading-relaxed">{rc.desc}</p>
                  </div>
                </div>

                <div className="space-y-6 mt-auto pt-6 border-t border-ink/8">
                  {uiState === STATE.VESSEL ? (
                    <>
                      <ProbabilityBar
                        label="Container ship" sublabel="Propeller cavitation signature"
                        value={scores.Container_Ship}
                        barClass="bg-brass-500" textClass="text-brass-500" delay={0}
                      />
                      <ProbabilityBar
                        label="Marine mammal" sublabel="Cetacean vocalization"
                        value={scores.Marine_Mammal}
                        barClass="bg-seaglass-500/60" textClass="text-ink/40" delay={140}
                      />
                    </>
                  ) : (
                    <>
                      <ProbabilityBar
                        label="Marine mammal" sublabel="Cetacean vocalization"
                        value={scores.Marine_Mammal}
                        barClass="bg-seaglass-500" textClass="text-seaglass-500" delay={0}
                      />
                      <ProbabilityBar
                        label="Container ship" sublabel="Propeller cavitation signature"
                        value={scores.Container_Ship}
                        barClass="bg-brass-500/60" textClass="text-ink/40" delay={140}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {uiState === STATE.ERROR && (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-rise">
                <div className="w-11 h-11 rounded-xl bg-rust-400/10 flex items-center justify-center mb-5">
                  <AlertTriangle className="w-5 h-5 text-rust-500" />
                </div>
                <p className="text-xs font-data text-rust-500 tracking-wide mb-2 uppercase">
                  Analysis failed
                </p>
                <p className="text-sm text-ink/45 leading-relaxed mb-4">
                  {errorMsg || 'Could not reach the inference backend.'}
                </p>
                <p className="font-data text-xs text-ink/30">
                  Make sure <span className="text-ink/50">main.py</span> is running on port 8000
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-ink/8 flex flex-col sm:flex-row gap-2 items-center justify-between text-center sm:text-left">
          <p className="font-data text-xs text-ink/35">
            DeepShip · Watkins Marine Mammal Database · TensorFlow
          </p>
          <p className="font-data text-xs text-ink/35">
            2D-CNN · 128×128 log-mel spectrogram · 22.05 kHz
          </p>
        </div>
      </main>
    </div>
  );
}