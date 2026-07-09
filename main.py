# main.py — Production Hydro-Acoustic Inference Engine Wrapper
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import librosa
import io
import tensorflow as tf

app = FastAPI(title="Hydro-Acoustic Passive Sonar Inference Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to your definitive frontend domain origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load weights once globally when the application initializes
model = tf.keras.models.load_model("acoustic_classifier.h5")
CLASSES = ["Container_Ship", "Marine_Mammal"]


@app.post("/api/v1/analyze-hydrophone")
async def analyze_hydrophone(file: UploadFile = File(...)):
    audio_bytes = await file.read()

    # Wrap raw bytes in an in-memory file-like object so librosa can decode the buffer
    y, sr = librosa.load(io.BytesIO(audio_bytes), sr=22050, duration=5.0)

    spectrogram = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, n_fft=2048, hop_length=512)
    log_spec = librosa.power_to_db(spectrogram, ref=np.max)

    # Force the time frame width axis precisely to 128x128
    if log_spec.shape[1] > 128:
        log_spec = log_spec[:, :128]
    elif log_spec.shape[1] < 128:
        log_spec = np.pad(log_spec, ((0, 0), (0, 128 - log_spec.shape[1])), mode="constant")

    # Expand dimensions to simulate batch size and single-channel depth: (1, 128, 128, 1)
    input_tensor = np.expand_dims(np.expand_dims(log_spec, axis=-1), axis=0)

    # FIX: Add verbose=0 to eliminate console logging lag spikes
    predictions = model.predict(input_tensor, verbose=0)[0]
    
    return {CLASSES[i]: float(predictions[i]) for i in range(len(CLASSES))}


@app.get("/health")
async def health():
    return {"status": "ok"}