# 🌊 Hydro-Acoustic Passive Sonar Marine Monitoring & Conservation Console

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.21-orange?logo=tensorflow&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.139-009688?logo=fastapi&logoColor=white)
![Librosa](https://img.shields.io/badge/Librosa-0.11-green?logo=python&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-purple)

**A production-grade AI system for real-time underwater acoustic classification — distinguishing commercial vessel noise from protected marine mammal vocalizations using a 2D Convolutional Neural Network trained on verified real-world hydrophone recordings.**

</div>

---

## 📡 Project Overview

This system implements a complete **end-to-end passive sonar signal analysis pipeline**:

1. **Data Acquisition** — Downloads two verified, citable real-world datasets:
   - 🚢 [DeepShip](https://github.com/irfankamboh/DeepShip) — 47+ hours of real underwater recordings of commercial ships (cargo, tanker, passenger, tug) *(Ge et al., Expert Systems with Applications, 2021)*
   - 🐬 [Watkins Marine Mammal Sound Database](https://cis.whoi.edu/science/B/whalesounds/index.cfm) — 1,357 authenticated cetacean vocalizations via the Hugging Face mirror `confit/wmms-parquet` *(Sayigh et al., POMA, 2016)*

2. **Signal Processing** — Slices recordings into 5-second chunks → computes Short-Time Fourier Transform (STFT) → maps to 128-mel log-scale spectrogram → outputs `(128, 128, 1)` tensors

3. **2D-CNN Training** — Trains a compact CNN with `EarlyStopping` on validation loss, saving the best-iteration weights

4. **FastAPI Inference Server** — Exposes a REST endpoint at `POST /api/v1/analyze-hydrophone` for real-time `.wav` file classification, consumed by a React frontend

---

## 🏗 Architecture Diagram

```
 ┌──────────────────────────────────────────────────────────┐
 │                    main.py — Pipeline                    │
 │                                                          │
 │  [DeepShip GitHub]──┐                                    │
 │                     ├─► raw .wav ─► 5s chunks            │
 │  [Watkins HF Hub]───┘         │                          │
 │                               │                          │
 │                     ┌─────────▼──────────┐               │
 │                     │  librosa           │               │
 │                     │  Mel-Spectrogram   │               │
 │                     │  (128×128×1 tensor)│               │
 │                     └─────────┬──────────┘               │
 │                               │                          │
 │                     ┌─────────▼──────────┐               │
 │                     │  2D-CNN (TF/Keras) │               │
 │                     │  Conv→Pool→Conv    │               │
 │                     │  →Pool→Dense→Drop  │               │
 │                     │  →Softmax (2 cls)  │               │
 │                     └─────────┬──────────┘               │
 │                               │ acoustic_classifier.h5   │
 │                               │                          │
 │                     ┌─────────▼──────────┐               │
 │                     │  FastAPI Server    │               │
 │                     │  :8000             │               │
 │                     └─────────┬──────────┘               │
 └───────────────────────────────┼──────────────────────────┘
                                 │ REST API
                    ┌────────────▼────────────┐
                    │  React Frontend Console │
                    │  (Drag-Drop .wav → JSON)│
                    └─────────────────────────┘
```

---

## 📁 Repository Structure

```
Hydro-Acoustic-Passive-Sonar-Marine-Monitoring-Conservation-Console/
├── main.py                              # Full pipeline: download → train → serve
├── .gitignore                           # Excludes datasets, model weights, venv
├── README.md                            # This file
└── Hydro_Acoustic_Automation_Notebook_v2 (1).ipynb  # Original Colab training notebook
```

> **Datasets and model weights are NOT committed to the repo** — they are auto-downloaded and re-generated at runtime.

---

## ⚙️ System Requirements

| Component | Minimum |
|-----------|---------|
| OS | Windows 10/11, macOS, Linux |
| Python | 3.10 or 3.11 |
| RAM | 8 GB (16 GB recommended) |
| Disk Space | ~10 GB free (for datasets + model) |
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

### Step 2 — Create a Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> If you get an execution policy error on PowerShell, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### Step 3 — Install Dependencies

```bash
pip install fastapi uvicorn tensorflow librosa python-multipart numpy datasets soundfile scikit-learn
```

> This installs all required packages into your virtual environment. The `datasets` package fetches the Watkins mammal audio from Hugging Face Hub on first run.

---

### Step 4 — Run the Backend Server

```bash
python main.py
```

**What happens on first run:**

| Phase | Description | Est. Time |
|-------|-------------|-----------|
| 🔧 GPU Config | Sets memory growth on available GPU | < 1s |
| 🚢 DeepShip Clone | Clones ship recordings from GitHub | 1–3 min |
| 🐬 Watkins Download | Downloads 1,357 mammal clips from HF Hub | 5–15 min |
| 🎵 Feature Extraction | Computes mel-spectrograms for all chunks | 5–20 min |
| 🧠 CNN Training | 15 epochs with early stopping | 10–60 min |
| 💾 Model Save | Saves `acoustic_classifier.h5` | < 1s |
| 🌐 API Launch | Serves REST API on port 8000 | < 2s |

> **On subsequent runs**, the model is loaded directly from `acoustic_classifier.h5` and the server launches immediately.

---

### Step 5 — Verify the Server is Running

Open a browser or run:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "ok"}
```

---

## 🔌 API Reference

### `POST /api/v1/analyze-hydrophone`

Classifies a `.wav` hydrophone recording as either a commercial vessel or a marine mammal.

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

Returns server and model status.

**Response:**
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
  └─ Dense(2, Softmax)  →  [Container_Ship, Marine_Mammal]

Total Parameters: ~3.7M
Optimizer: Adam
Loss: Sparse Categorical Crossentropy
Early Stopping: patience=3, monitor=val_loss, restore_best_weights=True
```

---

## 📊 Training Performance (Reference)

Results from the original Colab training run on the full DeepShip + Watkins dataset:

| Epoch | Train Acc | Val Acc | Val Loss |
|-------|-----------|---------|----------|
| 1 | 83.6% | 88.1% | 0.3659 |
| 5 | 96.3% | 96.8% | 0.1277 |
| 10 | 97.8% | 98.8% | 0.0576 |
| 15 | 97.4% | 99.2% | 0.0529 |

> Final validation accuracy: **~99.2%** on held-out 20% split

---

## 🛠 Troubleshooting

### GPU / TensorFlow Warnings
```
oneDNN custom operations are on. You may see slightly different numerical results...
```
This is an informational TensorFlow message, not an error. To suppress it:
```bash
set TF_ENABLE_ONEDNN_OPTS=0   # Windows
export TF_ENABLE_ONEDNN_OPTS=0  # macOS/Linux
```

### `RuntimeError: bad heap free list` on Model Load
The existing `acoustic_classifier.h5` file is corrupted (often caused by a partial download or Keras version mismatch). Delete it and let `main.py` retrain:
```bash
del acoustic_classifier.h5   # Windows
rm acoustic_classifier.h5    # macOS/Linux
python main.py
```

### DeepShip Returns 0 Files
The DeepShip public GitHub repo may contain only metadata links. If this occurs, the system will still train on the Watkins mammal dataset. For the full 47-hour DeepShip dataset, contact the authors per their [repo README](https://github.com/irfankamboh/DeepShip).

---

## 📚 Dataset Citations

If you use this system in research, please cite the original datasets:

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
