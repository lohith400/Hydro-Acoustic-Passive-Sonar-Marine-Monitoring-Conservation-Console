# 🌊 Hydro-Acoustic Passive Sonar Marine Monitoring & Conservation Console

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.21-orange?logo=tensorflow&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.139-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Librosa](https://img.shields.io/badge/Librosa-0.11-green?logo=python&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-purple)

**A full-stack, production-grade AI system for real-time underwater acoustic classification — distinguishing commercial vessel noise from protected marine mammal vocalizations using a 2D-CNN trained on verified real-world hydrophone recordings, served through a FastAPI backend and visualized in a daylight-mode React dashboard.**

</div>

---

## 📡 Project Overview

This system implements a complete **end-to-end passive sonar signal analysis platform**:

1. **Data Acquisition** — Auto-downloads two verified, citable real-world datasets:
   - 🚢 [DeepShip](https://github.com/irfankamboh/DeepShip) — 47+ hours of real underwater recordings of commercial ships (cargo, tanker, passenger, tug) *(Ge et al., Expert Systems with Applications, 2021)*
   - 🐬 [Watkins Marine Mammal Sound Database](https://cis.whoi.edu/science/B/whalesounds/index.cfm) — 1,357 authenticated cetacean vocalizations via Hugging Face mirror `confit/wmms-parquet` *(Sayigh et al., POMA, 2016)*

2. **Signal Processing** — Slices recordings into 5-second chunks → STFT → 128-mel log-scale spectrogram → `(128, 128, 1)` tensors

3. **2D-CNN Training** — Compact CNN with `EarlyStopping` on validation loss, saving best-iteration weights automatically

4. **FastAPI Inference Server** — REST endpoint at `POST /api/v1/analyze-hydrophone` for real-time `.wav` classification

5. **React Dashboard** — Daylight-mode maritime command console with drag-and-drop ingestion, animated probability bars, and 5 operational UI states

---

## 🏗 Architecture Diagram

```
 ┌─────────────────────────────────────────────────────────────┐
 │                     main.py — Pipeline                      │
 │                                                             │
 │  [DeepShip GitHub]──┐                                       │
 │                     ├─► raw .wav ─► 5-sec chunks            │
 │  [Watkins HF Hub]───┘         │                             │
 │                               │                             │
 │                     ┌─────────▼──────────┐                  │
 │                     │  librosa · numpy   │                  │
 │                     │  Mel-Spectrogram   │                  │
 │                     │  (128×128×1 tensor)│                  │
 │                     └─────────┬──────────┘                  │
 │                               │                             │
 │                     ┌─────────▼──────────┐                  │
 │                     │  2D-CNN (TF/Keras) │                  │
 │                     │  Conv→Pool→Conv    │                  │
 │                     │  →Pool→Dense→Drop  │                  │
 │                     │  →Softmax (2 cls)  │                  │
 │                     └─────────┬──────────┘                  │
 │                               │ acoustic_classifier.h5      │
 │                               │                             │
 │                     ┌─────────▼──────────┐                  │
 │                     │  FastAPI Server    │                  │
 │                     │  port 8000         │                  │
 │                     └─────────┬──────────┘                  │
 └───────────────────────────────┼─────────────────────────────┘
                                 │ POST /api/v1/analyze-hydrophone
          ┌──────────────────────▼──────────────────────────┐
          │         React Frontend (Vite + Tailwind)        │
          │  port 5173                                      │
          │                                                 │
          │  ┌──────────────┐   ┌────────────────────────┐ │
          │  │  Left Column │   │   Right Column (state) │ │
          │  │  • Dropzone  │   │   • IDLE placeholder   │ │
          │  │  • .wav pick │   │   • LOADING spinner    │ │
          │  │  • Analyze   │   │   • VESSEL amber card  │ │
          │  │    button    │   │   • MAMMAL green card  │ │
          │  │  • Spectrum  │   │   • ERROR rose panel   │ │
          │  └──────────────┘   └────────────────────────┘ │
          └─────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
Hydro-Acoustic-Passive-Sonar-Marine-Monitoring-Conservation-Console/
│
├── main.py                                    # Backend: full pipeline + FastAPI server
├── .gitignore                                 # Excludes datasets, model weights, venv
├── README.md                                  # This file
├── Hydro_Acoustic_Automation_Notebook_v2 (1).ipynb  # Original Colab training notebook
│
└── frontend/                                  # React dashboard (Vite + Tailwind CSS)
    ├── index.html                             # Entry HTML with Google Fonts
    ├── package.json                           # Node dependencies
    ├── tailwind.config.js                     # Tailwind v3 config
    ├── postcss.config.js                      # PostCSS pipeline
    └── src/
        ├── main.jsx                           # React root entry
        ├── index.css                          # Tailwind directives + custom utilities
        └── App.jsx                            # Complete dashboard component (all states)
```

> **Datasets and model weights are NOT committed** — they are auto-downloaded and re-generated at runtime.

---

## ⚙️ System Requirements

| Component | Requirement |
|-----------|------------|
| OS | Windows 10/11, macOS, Linux |
| Python | 3.10 or 3.11 |
| Node.js | 18 or later |
| RAM | 8 GB (16 GB recommended) |
| Disk Space | ~10 GB free (datasets + model) |
| GPU | Optional — Intel/AMD integrated GPU supported |
| Internet | Required on first run (dataset download) |

---

## 🚀 Getting Started

### Step 1 — Clone the Repository

```bash
git clone https://github.com/lohith400/Hydro-Acoustic-Passive-Sonar-Marine-Monitoring-Conservation-Console.git
cd Hydro-Acoustic-Passive-Sonar-Marine-Monitoring-Conservation-Console
```

---

### Step 2 — Set Up the Python Backend

#### 2a. Create a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> If you get an execution policy error, run this first:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### 2b. Install Python dependencies

```bash
pip install fastapi uvicorn tensorflow librosa python-multipart numpy datasets soundfile scikit-learn
```

> The `datasets` package fetches the Watkins mammal audio from Hugging Face Hub automatically on first run.

---

### Step 3 — Set Up the React Frontend

```bash
cd frontend
npm install
```

This installs all Node dependencies: React 18, Vite, Tailwind CSS v3, Lucide React icons, and PostCSS.

---

### Step 4 — Run Both Services

Open **two separate terminals** from the project root:

**Terminal 1 — Python Backend:**
```bash
# Windows
.\.venv\Scripts\python.exe main.py

# macOS / Linux
python main.py
```

**Terminal 2 — React Frontend:**
```bash
cd frontend
npm run dev
```

| Service | URL |
|---------|-----|
| 🐍 FastAPI Backend | http://localhost:8000 |
| ⚛️ React Dashboard | http://localhost:5173 |

---

### Step 5 — What Happens on First Run (Backend)

| Phase | Description | Est. Time |
|-------|-------------|-----------|
| 🔧 GPU Config | Sets memory growth on available GPU | < 1s |
| 🚢 DeepShip Clone | Clones ship recordings from GitHub | 1–3 min |
| 🐬 Watkins Download | Downloads 1,357 mammal clips from HF Hub | 5–15 min |
| 🎵 Feature Extraction | Computes mel-spectrograms for all chunks | 5–20 min |
| 🧠 CNN Training | Up to 15 epochs with early stopping | 10–60 min |
| 💾 Model Save | Saves `acoustic_classifier.h5` | < 1s |
| 🌐 API Launch | Serves REST API on port 8000 | < 2s |

> **On subsequent runs**, the model is loaded directly from `acoustic_classifier.h5` and the server starts immediately.

---

### Step 6 — Verify Both Services

**Backend health check:**
```bash
curl http://localhost:8000/health
```
```json
{"status": "ok"}
```

**Frontend** — Open http://localhost:5173 in your browser. You should see the Hydro-Acoustic Marine Monitoring System dashboard.

---

## 🖥️ Dashboard UI Guide

The React console has two columns:

**Left Column — Control & Ingestion:**
- Drag-and-drop or click to select a `.wav` hydrophone recording
- System node information panel (model specs, endpoint)
- Frequency spectrum visualizer
- **INITIALIZE HYDROPHONE ANALYSIS** button

**Right Column — Acoustic Analytics Matrix (5 states):**

| State | Trigger | Display |
|-------|---------|---------|
| **STANDBY** | Default / file cleared | Waveform placeholder mesh |
| **PROCESSING** | Analysis in progress | Circular spinner + STFT description |
| **VESSEL DETECTED** | `Container_Ship` score is highest | Amber card + propeller cavitation alert + probability bars |
| **MAMMAL DETECTED** | `Marine_Mammal` score is highest | Emerald card + cetacean protection alert + 10-knot compliance rule |
| **SYSTEM FAULT** | Network error / invalid file | Rose warning panel + error details |

---

## 🔌 API Reference

### `POST /api/v1/analyze-hydrophone`

Classifies a `.wav` hydrophone recording.

**Request:**
```
Content-Type: multipart/form-data
Body: file=<your_recording.wav>
```

**Example (cURL):**
```bash
curl -X POST http://localhost:8000/api/v1/analyze-hydrophone \
  -F "file=@your_recording.wav"
```

**Response:**
```json
{
  "Container_Ship": 0.0412,
  "Marine_Mammal": 0.9588
}
```

| Field | Type | Description |
|-------|------|-------------|
| `Container_Ship` | `float` | Probability score for commercial vessel noise (0.0–1.0) |
| `Marine_Mammal` | `float` | Probability score for cetacean vocalization (0.0–1.0) |

> Both values always sum to `1.0`

---

### `GET /health`

Returns server status.

```json
{"status": "ok"}
```

---

## 🧠 Model Architecture

```
Input: (128, 128, 1) — Log-Mel Spectrogram Tensor
  │
  ├─ Conv2D(32 filters, 3×3, ReLU)
  ├─ MaxPooling2D(2×2)
  ├─ Conv2D(64 filters, 3×3, ReLU)
  ├─ MaxPooling2D(2×2)
  ├─ Flatten
  ├─ Dense(64, ReLU)
  ├─ Dropout(0.3)
  └─ Dense(2, Softmax) → [Container_Ship, Marine_Mammal]

Total Parameters: ~3.7M
Optimizer:        Adam
Loss:             Sparse Categorical Crossentropy
Early Stopping:   patience=3, monitor=val_loss, restore_best_weights=True
```

---

## 📊 Training Performance (Reference)

Results from the Colab training run on the full DeepShip + Watkins dataset:

| Epoch | Train Acc | Val Acc | Val Loss |
|-------|-----------|---------|----------|
| 1 | 83.6% | 88.1% | 0.3659 |
| 5 | 96.3% | 96.8% | 0.1277 |
| 10 | 97.8% | 98.8% | 0.0576 |
| 15 | 97.4% | 99.2% | 0.0529 |

> Final validation accuracy: **~99.2%** on held-out 20% split

---

## 🛠 Troubleshooting

### TensorFlow oneDNN Informational Warning
```
oneDNN custom operations are on. You may see slightly different numerical results...
```
This is not an error. To suppress:
```bash
set TF_ENABLE_ONEDNN_OPTS=0    # Windows
export TF_ENABLE_ONEDNN_OPTS=0 # macOS/Linux
```

### `RuntimeError: bad heap free list` on Model Load
The `acoustic_classifier.h5` file is corrupted. Delete it and let `main.py` retrain:
```bash
del acoustic_classifier.h5    # Windows
rm acoustic_classifier.h5     # macOS/Linux
python main.py
```

### DeepShip Returns 0 Files
The public DeepShip GitHub repo may only contain metadata. The system will still train using the Watkins mammal dataset. For the full 47-hour dataset, contact the authors via the [DeepShip repo README](https://github.com/irfankamboh/DeepShip).

### Frontend Shows CORS Error
Ensure `main.py` is running with CORS middleware enabled (`allow_origins=["*"]`). This is already configured by default. Also ensure the backend is running on port **8000** — not any other port.

### PowerShell Execution Policy Error
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📚 Dataset Citations

**DeepShip:**
> Ge, M., et al. *DeepShip: An underwater acoustic benchmark dataset and a separable convolution based autoencoder for classification.* Expert Systems with Applications, 183, 2021. https://github.com/irfankamboh/DeepShip

**Watkins Marine Mammal Sound Database:**
> Sayigh, L., Daher, M.A., Allen, J., Gordon, H., Joyce, K., Stuhlmann, C., Tyack, P. *The Watkins Marine Mammal Sound Database: An online, freely accessible resource.* Proceedings of Meetings on Acoustics, 27(1), 040013, 2016. https://cis.whoi.edu/science/B/whalesounds/index.cfm

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

Built for real-time cetacean protection and maritime compliance monitoring 🐳

</div>
