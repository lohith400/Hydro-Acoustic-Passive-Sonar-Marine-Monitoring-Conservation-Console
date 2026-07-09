/**
 * App.jsx — Hydro-Acoustic Passive Sonar Marine Monitoring & Conservation Console
 *
 * State Machine:
 *   IDLE     → No file selected or analysis not started
 *   LOADING  → POST request in-flight to FastAPI backend
 *   SUCCESS  → API returned valid JSON; sub-state determined by highest probability class
 *   ERROR    → Network failure or malformed response
 *
 * Backend Contract:
 *   POST http://localhost:8000/api/v1/analyze-hydrophone
 *   Body: FormData { file: <wav File> }
 *   Response: { "Container_Ship": float, "Marine_Mammal": float }
 */

import { useState, useRef, useCallback } from 'react';
import {
  Waves,
  Ship,
  ShieldAlert,
  AlertTriangle,
  Upload,
  FileAudio,
  Activity,
  Radio,
  Anchor,
  Cpu,
  X,
  CheckCircle2,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_ENDPOINT = 'http://localhost:8000/api/v1/analyze-hydrophone';

// Valid state identifiers for the right-column panel
const UI_STATE = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  VESSEL: 'VESSEL',       // SUCCESS — Container_Ship dominant
  MAMMAL: 'MAMMAL',       // SUCCESS — Marine_Mammal dominant
  ERROR: 'ERROR',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * SystemStatusBadge — Pulsing "CNN INFERENCE NODE OPERATIONAL" pill in the header.
 */
function SystemStatusBadge() {
  return (
    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide">
      {/* Animated green pulse dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      CNN INFERENCE NODE OPERATIONAL
    </div>
  );
}

/**
 * ProbabilityBar — Animated horizontal progress bar for a single class score.
 *
 * @param {string}  label     — Display label (e.g. "Container Ship")
 * @param {number}  value     — Float 0.0–1.0
 * @param {string}  barColor  — Tailwind bg class for the fill
 * @param {string}  textColor — Tailwind text class for the percentage
 */
function ProbabilityBar({ label, value, barColor, textColor }) {
  const pct = (value * 100).toFixed(2);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className={`font-mono-data text-sm font-semibold tabular-nums ${textColor}`}>
          {pct}%
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
        <div
          className={`h-3 rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * RawReadout — Monospace key/value metadata row used in the telemetry panel.
 */
function RawReadout({ label, value, valueClass = 'text-teal-600' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</span>
      <span className={`font-mono-data text-xs font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─── Right Column Panel States ────────────────────────────────────────────────

/**
 * IdlePanel — Default state. Faint placeholder grid with a Waves icon.
 */
function IdlePanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[340px] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
      {/* Decorative background waveform grid */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full bg-teal-50 border border-teal-100 animate-pulse-slow" />
        </div>
        <Waves className="relative z-10 w-14 h-14 text-teal-300 mx-auto" strokeWidth={1.2} />
      </div>
      <h3 className="text-slate-400 font-semibold text-sm tracking-widest uppercase mb-2">
        Acoustic Feed Standby
      </h3>
      <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
        Awaiting hydro-acoustic wave feed input…
        <br />
        Select a <span className="font-mono-data text-slate-500">.wav</span> file to process telemetry.
      </p>
      {/* Decorative scan lines */}
      <div className="mt-8 flex gap-1.5 items-end h-8">
        {[4, 6, 9, 5, 7, 11, 6, 8, 4, 7, 10, 5, 8, 6].map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-sm bg-slate-200"
            style={{ height: `${h * 4}px` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * LoadingPanel — In-flight state. Spinner + STFT processing description.
 */
function LoadingPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[340px] rounded-xl border border-teal-200 bg-teal-50/40 p-10 text-center">
      {/* Circular spinner */}
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500 animate-spin" />
        <Activity className="absolute inset-0 m-auto w-6 h-6 text-teal-500" />
      </div>
      <h3 className="text-teal-700 font-bold text-sm tracking-widest uppercase mb-3">
        Processing Signal
      </h3>
      <p className="text-teal-600/80 text-xs leading-relaxed max-w-sm">
        Computing Short-Time Fourier Transform (STFT) &amp; Generating
        <br />
        Log-Mel Spectrogram Matrix Tensors…
      </p>
      {/* Animated scan bar */}
      <div className="mt-8 w-full max-w-xs h-1 bg-teal-100 rounded-full overflow-hidden">
        <div className="h-full bg-teal-400 rounded-full animate-[scan_1.5s_ease-in-out_infinite]"
          style={{
            animation: 'scan 1.6s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes scan {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
      <p className="mt-3 text-teal-500/70 font-mono-data text-[10px] tracking-widest">
        CNN INFERENCE ENGINE ACTIVE
      </p>
    </div>
  );
}

/**
 * VesselPanel — Container_Ship dominant. Amber-themed alert card.
 *
 * @param {{ Container_Ship: number, Marine_Mammal: number }} scores
 * @param {string} fileName
 */
function VesselPanel({ scores, fileName }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-6 space-y-5">
      {/* ── Detection header ── */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
          <Ship className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
              CLASS 0 — VESSEL ISOLATED
            </span>
          </div>
          <h2 className="text-base font-bold text-amber-800 leading-tight">
            COMMERCIAL TRAFFIC DETECTED
          </h2>
          <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
            Low-frequency propeller cavitation signature isolated. Logged to regional maritime monitoring grid.
          </p>
        </div>
      </div>

      {/* ── Probability meters ── */}
      <div className="bg-white/70 rounded-lg border border-amber-100 p-4 space-y-4">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">
          Acoustic Classification Confidence Matrix
        </p>
        <ProbabilityBar
          label="Container Ship / Vessel"
          value={scores.Container_Ship}
          barColor="bg-amber-400"
          textColor="text-amber-600"
        />
        <ProbabilityBar
          label="Marine Mammal / Cetacean"
          value={scores.Marine_Mammal}
          barColor="bg-emerald-400"
          textColor="text-emerald-600"
        />
      </div>

      {/* ── Telemetry readouts ── */}
      <div className="bg-white/70 rounded-lg border border-amber-100 p-4">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">
          Signal Metadata
        </p>
        <RawReadout label="Source File" value={fileName} valueClass="text-slate-600" />
        <RawReadout label="Sample Rate" value="22,050 Hz" />
        <RawReadout label="Chunk Duration" value="5.00 s" />
        <RawReadout label="Mel Bands" value="128 × 128" />
        <RawReadout label="Detection Class" value="Container_Ship" valueClass="text-amber-600" />
        <RawReadout
          label="Confidence"
          value={`${(scores.Container_Ship * 100).toFixed(2)}%`}
          valueClass="text-amber-600"
        />
        <RawReadout label="Compliance Action" value="Log to Grid" valueClass="text-slate-500" />
      </div>

      {/* ── Status footer ── */}
      <div className="flex items-center gap-2 text-amber-600 bg-amber-100/60 rounded-lg px-3 py-2 border border-amber-200">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs font-medium">
          Vessel signature logged to regional maritime monitoring grid.
        </p>
      </div>
    </div>
  );
}

/**
 * MammalPanel — Marine_Mammal dominant. Emerald-themed ecological alert.
 *
 * @param {{ Container_Ship: number, Marine_Mammal: number }} scores
 * @param {string} fileName
 */
function MammalPanel({ scores, fileName }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 space-y-5">
      {/* ── Detection header ── */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
              CLASS 1 — MAMMAL ISOLATED
            </span>
          </div>
          <h2 className="text-base font-bold text-emerald-800 leading-tight">
            ECOLOGICAL PROXIMITY ALERT
          </h2>
          <p className="text-xs text-emerald-700/80 mt-1 leading-relaxed">
            Protected cetacean vocalization matrix identified. Triggering automatic regional port
            compliance rules: Mandating immediate ship speed reduction to{' '}
            <strong>10 knots</strong>.
          </p>
        </div>
      </div>

      {/* ── Probability meters ── */}
      <div className="bg-white/70 rounded-lg border border-emerald-100 p-4 space-y-4">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">
          Acoustic Classification Confidence Matrix
        </p>
        <ProbabilityBar
          label="Marine Mammal / Cetacean"
          value={scores.Marine_Mammal}
          barColor="bg-emerald-500"
          textColor="text-emerald-600"
        />
        <ProbabilityBar
          label="Container Ship / Vessel"
          value={scores.Container_Ship}
          barColor="bg-amber-400"
          textColor="text-amber-600"
        />
      </div>

      {/* ── Telemetry readouts ── */}
      <div className="bg-white/70 rounded-lg border border-emerald-100 p-4">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">
          Signal Metadata
        </p>
        <RawReadout label="Source File" value={fileName} valueClass="text-slate-600" />
        <RawReadout label="Sample Rate" value="22,050 Hz" />
        <RawReadout label="Chunk Duration" value="5.00 s" />
        <RawReadout label="Mel Bands" value="128 × 128" />
        <RawReadout label="Detection Class" value="Marine_Mammal" valueClass="text-emerald-600" />
        <RawReadout
          label="Confidence"
          value={`${(scores.Marine_Mammal * 100).toFixed(2)}%`}
          valueClass="text-emerald-600"
        />
        <RawReadout label="Compliance Action" value="Speed Limit: 10 kn" valueClass="text-rose-500" />
      </div>

      {/* ── Compliance alert footer ── */}
      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100/60 rounded-lg px-3 py-2 border border-emerald-200">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs font-medium">
          Port authority notified. Speed reduction protocol activated in adjacent shipping lanes.
        </p>
      </div>
    </div>
  );
}

/**
 * ErrorPanel — Network or parsing failure state. Soft-rose warning card.
 *
 * @param {string} message — Error detail to display
 */
function ErrorPanel({ message }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
        <div>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-rose-400 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 inline-block mb-1">
            SYSTEM FAULT — INFERENCE FAILURE
          </span>
          <h2 className="text-base font-bold text-rose-800">
            SIGNAL PROCESSING ERROR
          </h2>
          <p className="text-xs text-rose-600/80 mt-1 leading-relaxed">
            Network connection failure or unreadable audio header profile detected.
            Verify the FastAPI backend is running on port 8000 and the file is a valid
            <span className="font-mono-data text-rose-700"> .wav</span> recording.
          </p>
        </div>
      </div>

      {/* Error detail block */}
      {message && (
        <div className="bg-white/70 rounded-lg border border-rose-200 p-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-1">
            Error Detail
          </p>
          <p className="font-mono-data text-xs text-rose-600 break-all leading-relaxed">
            {message}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 text-rose-600 bg-rose-100/60 rounded-lg px-3 py-2 border border-rose-200">
        <Radio className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs font-medium">
          Ensure <span className="font-mono-data">uvicorn main:app --port 8000</span> is running and CORS is enabled.
        </p>
      </div>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────────

export default function App() {
  // ── State ──
  /** @type {[File|null, Function]} — Selected .wav file */
  const [selectedFile, setSelectedFile] = useState(null);

  /**
   * uiState — controls which right-column panel renders
   * Values: 'IDLE' | 'LOADING' | 'VESSEL' | 'MAMMAL' | 'ERROR'
   */
  const [uiState, setUiState] = useState(UI_STATE.IDLE);

  /** Raw backend scores: { Container_Ship: float, Marine_Mammal: float } */
  const [scores, setScores] = useState({ Container_Ship: 0, Marine_Mammal: 0 });

  /** Error message string for the ERROR panel */
  const [errorMsg, setErrorMsg] = useState('');

  /** Drag-over highlight flag */
  const [isDragOver, setIsDragOver] = useState(false);

  /** Hidden file input ref */
  const fileInputRef = useRef(null);

  // ── File Selection Handlers ──

  /**
   * handleFileSelect — validates .wav extension then stores the File object.
   * Called by both the click-to-browse input and the drag-and-drop handler.
   */
  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.wav')) {
      setErrorMsg('Invalid file type. Only Linear PCM .wav archives are accepted.');
      setUiState(UI_STATE.ERROR);
      return;
    }
    setSelectedFile(file);
    // Reset any previous results when a new file is chosen
    setUiState(UI_STATE.IDLE);
    setScores({ Container_Ship: 0, Marine_Mammal: 0 });
    setErrorMsg('');
  }, []);

  /** onChange handler for the hidden <input type="file"> */
  const onInputChange = (e) => {
    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
  };

  /** Clear the selected file and reset to idle */
  const clearFile = () => {
    setSelectedFile(null);
    setUiState(UI_STATE.IDLE);
    setScores({ Container_Ship: 0, Marine_Mammal: 0 });
    setErrorMsg('');
    // Reset the hidden input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Drag-and-Drop Handlers ──
  const onDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // ── API Call ──

  /**
   * runAnalysis — Sends the selected file to the FastAPI backend via FormData POST.
   * Updates uiState through the LOADING → (VESSEL | MAMMAL | ERROR) lifecycle.
   */
  const runAnalysis = async () => {
    if (!selectedFile) return;

    // Transition to LOADING state — re-renders right column to spinner
    setUiState(UI_STATE.LOADING);
    setErrorMsg('');

    try {
      // Build multipart form payload; key must be exactly "file" per backend contract
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type header — browser must set it with boundary param
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} — ${response.statusText}`);
      }

      // Parse JSON: { "Container_Ship": float, "Marine_Mammal": float }
      const data = await response.json();
      const shipScore   = data?.Container_Ship  ?? 0;
      const mammalScore = data?.Marine_Mammal ?? 0;

      setScores({ Container_Ship: shipScore, Marine_Mammal: mammalScore });

      // Determine dominant class and set final SUCCESS state
      if (mammalScore > shipScore) {
        setUiState(UI_STATE.MAMMAL);  // Marine mammal dominant → ecological alert
      } else {
        setUiState(UI_STATE.VESSEL);  // Container ship dominant → traffic detection
      }

    } catch (err) {
      // Network error, timeout, or unexpected response format
      setErrorMsg(err.message || 'Unknown network error. Check backend connection.');
      setUiState(UI_STATE.ERROR);
    }
  };

  // ── Derived booleans ──
  const isLoading   = uiState === UI_STATE.LOADING;
  const canAnalyze  = !!selectedFile && !isLoading;

  // ── Render ──
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ════════════════════════════════════════════════════════════════
          HEADER BANNER
      ════════════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

          {/* Left: Logo + Title block */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center shadow-sm">
              <Anchor className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-widest text-slate-800 uppercase leading-tight truncate">
                Hydro-Acoustic Marine Monitoring System
              </h1>
              <p className="text-[11px] text-slate-400 tracking-wide leading-tight mt-0.5 truncate">
                Passive Sonar Signal Analysis Platform — Automated Cetacean Protection &amp; Vessel Tracking
              </p>
            </div>
          </div>

          {/* Right: Status badge */}
          <div className="flex-shrink-0">
            <SystemStatusBadge />
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          MAIN TWO-COLUMN COMMAND VIEW
      ════════════════════════════════════════════════════════════════ */}
      <main className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">

          {/* ═══════════════════════════════════
              LEFT COLUMN — Control & Ingestion
              5 columns wide on lg+, full width on mobile
          ═══════════════════════════════════ */}
          <aside className="col-span-12 lg:col-span-5 space-y-5">

            {/* ── System Info Card ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500">
                  System Node
                </h2>
              </div>
              <div className="space-y-0">
                <RawReadout label="Inference Engine"  value="TensorFlow 2.21 / Keras" />
                <RawReadout label="Model Architecture" value="2D-CNN · 3.7M params" />
                <RawReadout label="Classes"            value="Container_Ship · Marine_Mammal" />
                <RawReadout label="Input Tensor"       value="128 × 128 × 1 (Log-Mel)" />
                <RawReadout label="Sampling Rate"      value="22,050 Hz target" />
                <RawReadout label="Backend Endpoint"   value="localhost:8000" />
              </div>
            </div>

            {/* ── Ingestion Card — Drag & Drop Zone ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500">
                  Hydrophone Telemetry Ingestion
                </h2>
              </div>

              {/* Drop Zone */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Click or drag a .wav file to upload"
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && !selectedFile && fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`
                  relative flex flex-col items-center justify-center
                  rounded-xl border-2 border-dashed p-8 text-center
                  transition-all duration-200 cursor-pointer select-none
                  ${selectedFile
                    ? 'border-teal-300 bg-teal-50/40 cursor-default'
                    : isDragOver
                      ? 'border-teal-400 bg-teal-50 scale-[1.01]'
                      : 'border-slate-200 bg-slate-50/60 hover:border-teal-300 hover:bg-teal-50/30'
                  }
                `}
              >
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  id="wav-file-input"
                  type="file"
                  accept=".wav,audio/wav,audio/x-wav"
                  className="hidden"
                  onChange={onInputChange}
                />

                {selectedFile ? (
                  /* ── File Selected State ── */
                  <div className="w-full">
                    <div className="flex items-center gap-3 bg-white rounded-lg border border-teal-200 px-4 py-3">
                      <div className="flex-shrink-0 w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
                        <FileAudio className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-semibold text-teal-800 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-teal-500 font-mono-data mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB · audio/wav
                        </p>
                      </div>
                      {/* Clear file button */}
                      <button
                        id="clear-file-btn"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); clearFile(); }}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-colors"
                        aria-label="Clear selected file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-teal-500 mt-2 text-center">
                      File staged and ready for inference
                    </p>
                  </div>
                ) : (
                  /* ── Empty Drop Zone ── */
                  <>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">
                      Drag &amp; drop a telemetry file
                    </p>
                    <p className="text-xs text-slate-400 mb-3">
                      or{' '}
                      <span className="text-teal-600 font-semibold underline underline-offset-2 cursor-pointer">
                        browse to select
                      </span>
                    </p>
                    {/* Metadata labels */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="font-mono-data text-[10px] tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        Linear PCM Archive
                      </span>
                      <span className="font-mono-data text-[10px] tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        22.05 kHz Target Subsampling Rate
                      </span>
                      <span className="font-mono-data text-[10px] tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        .wav only
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Primary Action Button ── */}
            <button
              id="analyze-btn"
              type="button"
              onClick={runAnalysis}
              disabled={!canAnalyze}
              className={`
                w-full flex items-center justify-center gap-3
                rounded-xl px-6 py-4 text-sm font-bold tracking-widest uppercase
                border transition-all duration-200 shadow-sm
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${canAnalyze
                  ? 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white border-teal-700 focus:ring-teal-500 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analysing Signal…
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Initialize Hydrophone Analysis
                </>
              )}
            </button>

            {/* ── Acoustic spectrum decorative bars ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500">
                  Frequency Spectrum Monitor
                </h2>
              </div>
              <div className="flex items-end gap-0.5 h-16">
                {Array.from({ length: 48 }, (_, i) => {
                  const active = uiState === UI_STATE.LOADING || uiState === UI_STATE.VESSEL || uiState === UI_STATE.MAMMAL;
                  const baseH = Math.sin(i * 0.4) * 30 + 35;
                  const color = uiState === UI_STATE.MAMMAL ? 'bg-emerald-400'
                    : uiState === UI_STATE.VESSEL ? 'bg-amber-400'
                    : 'bg-teal-300';
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-all duration-500 ${color} ${active ? 'opacity-80' : 'opacity-30'}`}
                      style={{
                        height: active
                          ? `${baseH + Math.random() * 20}%`
                          : `${baseH * 0.4}%`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-mono-data text-[9px] text-slate-300">20 Hz</span>
                <span className="font-mono-data text-[9px] text-slate-300">10 kHz</span>
              </div>
            </div>

          </aside>

          {/* ═══════════════════════════════════
              RIGHT COLUMN — Acoustic Analytics Matrix
              7 columns wide on lg+, full width on mobile
          ═══════════════════════════════════ */}
          <section className="col-span-12 lg:col-span-7">

            {/* Panel header */}
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-teal-600" />
              <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500">
                Acoustic Analytics Matrix
              </h2>
              <div className="flex-1 h-px bg-slate-200" />
              {/* Dynamic state indicator */}
              <span className={`
                text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full border
                ${uiState === UI_STATE.IDLE    ? 'text-slate-400 bg-slate-100 border-slate-200'    : ''}
                ${uiState === UI_STATE.LOADING ? 'text-teal-600 bg-teal-50 border-teal-200'         : ''}
                ${uiState === UI_STATE.VESSEL  ? 'text-amber-600 bg-amber-50 border-amber-200'      : ''}
                ${uiState === UI_STATE.MAMMAL  ? 'text-emerald-600 bg-emerald-50 border-emerald-200': ''}
                ${uiState === UI_STATE.ERROR   ? 'text-rose-500 bg-rose-50 border-rose-200'         : ''}
              `}>
                {uiState === UI_STATE.IDLE    && 'STANDBY'}
                {uiState === UI_STATE.LOADING && 'PROCESSING'}
                {uiState === UI_STATE.VESSEL  && 'VESSEL DETECTED'}
                {uiState === UI_STATE.MAMMAL  && 'MAMMAL DETECTED'}
                {uiState === UI_STATE.ERROR   && 'SYSTEM FAULT'}
              </span>
            </div>

            {/* ── Dynamic panel — switches based on uiState ── */}
            {uiState === UI_STATE.IDLE && <IdlePanel />}
            {uiState === UI_STATE.LOADING && <LoadingPanel />}
            {uiState === UI_STATE.VESSEL && (
              <VesselPanel scores={scores} fileName={selectedFile?.name ?? '—'} />
            )}
            {uiState === UI_STATE.MAMMAL && (
              <MammalPanel scores={scores} fileName={selectedFile?.name ?? '—'} />
            )}
            {uiState === UI_STATE.ERROR && <ErrorPanel message={errorMsg} />}

          </section>
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-200 mt-8">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-mono-data tracking-wide">
            OCEAN · Hydro-Acoustic Passive Sonar Marine Monitoring &amp; Conservation Console
          </p>
          <p className="text-[11px] text-slate-300 font-mono-data">
            DeepShip · Watkins DB · TensorFlow 2.21
          </p>
        </div>
      </footer>
    </div>
  );
}
