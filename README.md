# 🌊 Hydro-Acoustic Marine Monitoring Console

A real-time underwater acoustic classifier that distinguishes commercial vessel noise from protected marine mammal vocalizations using a 2D-CNN deep learning model.

---

## 📡 System Architecture & Datasets

### 1. Data Sources (Auto-Downloaded)
* **🚢 DeepShip Dataset:** 47+ hours of commercial ship noise recordings (cargo, tanker, passenger, tug) for ship signature classification.
* **🐬 Watkins Marine Mammal Database:** 1,357 authenticated marine mammal calls (whale/cetacean vocalizations) for proximity classification.

### 2. Signal Pipeline & Model
* **Signal Processing:** Slices audio files into 5-second chunks, computes the Short-Time Fourier Transform (STFT), and generates a 128-mel log-scale spectrogram tensor `(128, 128, 1)`.
* **2D-CNN Model:** Trains a custom convolutional network (Conv2D -> MaxPooling -> Conv2D -> MaxPooling -> Dense -> Dropout -> Softmax) on the processed tensors, saving optimized weights to `acoustic_classifier.keras`.

### 3. FastAPI Endpoint
* `POST /api/v1/analyze-hydrophone`: Accepts a `.wav` file under the key `file` and returns confidence percentages:
  ```json
  {
    "Container_Ship": 0.0412,
    "Marine_Mammal": 0.9588
  }
  ```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/lohith400/Hydro-Acoustic-Passive-Sonar-Marine-Monitoring-Conservation-Console.git
cd Hydro-Acoustic-Passive-Sonar-Marine-Monitoring-Conservation-Console
```

---

### 2. Set Up the Backend

#### Create a virtual environment & activate it:
* **Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```
* **macOS / Linux:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

#### Install dependencies & run the server:
```bash
pip install fastapi uvicorn tensorflow librosa python-multipart numpy datasets soundfile scikit-learn
python main.py
```

> **Note on first run:** The script will automatically download datasets, preprocess audio chunks, train the model, save the weights, and launch the API service at `http://localhost:8000`. On subsequent runs, it will boot instantly using the saved model.

---

### 3. Set Up the Frontend

Open a **new terminal window** and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend dashboard will be live at `http://localhost:5173`.

---

## 🖥️ How to Use

1. Open `http://localhost:5173` in your web browser.
2. Drag and drop or browse to select a hydrophone `.wav` recording.
3. Click **Analyze recording**.
4. The dashboard will compute the spectrogram, query the model, and display the classification (Vessel vs. Marine Mammal) with real-time probability scores and port compliance recommendations.

---

## 📁 Project Structure

```
Hydro-Acoustic-Passive-Sonar-Marine-Monitoring-Conservation-Console/
├── main.py                     # Python backend (ML pipeline + FastAPI server)
├── README.md                   # Setup guide & project overview
├── .gitignore                  # Global git ignores
└── frontend/                   # React frontend
    ├── index.html              # HTML entry template
    ├── package.json            # Node configuration
    └── src/
        ├── App.jsx             # Main dashboard UI & API integration
        └── index.css           # Styling rules & transitions
```
