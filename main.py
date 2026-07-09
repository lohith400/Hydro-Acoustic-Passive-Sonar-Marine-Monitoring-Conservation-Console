# main.py — Fully Integrated Hydro-Acoustic Inference Pipeline & API
import io
import os
import glob
import shutil
import subprocess
import librosa
import numpy as np
import tensorflow as tf
import soundfile as sf
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from datasets import load_dataset, Audio
from sklearn.model_selection import train_test_split
from tensorflow.keras import layers, models, callbacks

# 1. FORCE LOCAL GPU ALLOCATION WITH MEMORY GROWTH
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print("Local integrated GPU hardware acceleration configured successfully.")
    except RuntimeError as e:
        print(f"GPU initialization flag error: {e}")

MODEL_PATH = "acoustic_classifier.h5"
CLASSES = ["Container_Ship", "Marine_Mammal"]

# 2. RUN DOWNLOAD & TRAINING PIPELINE IF MODEL IS MISSING OR CORRUPT
def run_training_pipeline():
    print("--------------------------------------------------------------------------------")
    print("MODEL FILE MISSING OR INVALID. STARTING REAL-TIME PIPELINE...")
    print("--------------------------------------------------------------------------------")

    # Step A: Download DeepShip (Ships)
    os.makedirs("./real_raw_data/ships", exist_ok=True)
    if not os.path.exists("./DeepShip"):
        print("Cloning DeepShip repository (GitHub) for ship-radiated noise dataset...")
        subprocess.run(["git", "clone", "--depth", "1", "https://github.com/irfankamboh/DeepShip.git"], check=True)
    
    ship_files = glob.glob("./DeepShip/**/*.wav", recursive=True)
    print(f"Found {len(ship_files)} DeepShip .wav files. Staging...")
    for i, f in enumerate(ship_files):
        shutil.copy(f, f"./real_raw_data/ships/ship_{i:03d}.wav")

    # Step B: Download Watkins (Mammals)
    os.makedirs("./real_raw_data/mammals", exist_ok=True)
    print("Downloading Watkins Marine Mammal Sound Database (Hugging Face mirror)...")
    ds = load_dataset("confit/wmms-parquet", split="train")
    ds = ds.cast_column("audio", Audio(decode=False))

    saved_mammals = 0
    for i, row in enumerate(ds):
        try:
            audio_bytes = row["audio"]["bytes"]
            data, samplerate = sf.read(io.BytesIO(audio_bytes))
            sf.write(f"./real_raw_data/mammals/mammal_{i:04d}.wav", data, samplerate)
            saved_mammals += 1
        except Exception:
            continue
        if saved_mammals % 200 == 0:
            print(f"  ...saved {saved_mammals} mammal files so far")
    print(f"-> Staged {saved_mammals} Watkins DB mammal recordings.")

    # Step C: Mel-Spectrogram Feature Extraction (128x128x1)
    def process_audio_file(file_path, label, chunk_duration=5.0, target_sr=22050):
        X, y = [], []
        samples_per_chunk = int(chunk_duration * target_sr)
        try:
            audio_data, sr = librosa.load(file_path, sr=target_sr)
        except Exception as e:
            print(f"Skipping unreadable file {file_path}: {e}")
            return X, y

        for start in range(0, len(audio_data), samples_per_chunk):
            chunk = audio_data[start:start + samples_per_chunk]
            if len(chunk) == samples_per_chunk:
                melspec = librosa.feature.melspectrogram(
                    y=chunk, sr=target_sr, n_mels=128, n_fft=2048, hop_length=512
                )
                log_melspec = librosa.power_to_db(melspec, ref=np.max)

                # Ensure dimensions are exactly 128x128
                if log_melspec.shape[1] > 128:
                    log_melspec = log_melspec[:, :128]
                elif log_melspec.shape[1] < 128:
                    log_melspec = np.pad(
                        log_melspec, ((0, 0), (0, 128 - log_melspec.shape[1])), mode="constant"
                    )
                X.append(log_melspec)
                y.append(label)
        return X, y

    print("Extracting features (Mel-Spectrograms)...")
    X_all, y_all = [], []
    for f in sorted(glob.glob("./real_raw_data/ships/*.wav")):
        X_file, y_file = process_audio_file(f, label=0)
        X_all.extend(X_file)
        y_all.extend(y_file)

    for f in sorted(glob.glob("./real_raw_data/mammals/*.wav")):
        X_file, y_file = process_audio_file(f, label=1)
        X_all.extend(X_file)
        y_all.extend(y_file)

    X_real = np.array(X_all)
    y_real = np.array(y_all)
    X_real = np.expand_dims(X_real, axis=-1)

    print(f"Feature dataset ready. Shape: {X_real.shape}")
    print(f"Class distribution -> Ships (0): {(y_real==0).sum()} | Mammals (1): {(y_real==1).sum()}")

    # Step D: Split dataset
    X_train, X_val, y_train, y_val = train_test_split(
        X_real, y_real, test_size=0.2, random_state=42, stratify=y_real
    )

    # Step E: Build CNN and Run Training Loop
    print("Building 2D-CNN Architecture...")
    model = models.Sequential([
        layers.Input(shape=(128, 128, 1)),
        layers.Conv2D(32, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(2, activation='softmax')
    ])

    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    model.summary()

    early_stopping = callbacks.EarlyStopping(
        monitor='val_loss',
        patience=3,
        restore_best_weights=True
    )

    print("Initializing optimized training loop with early stopping callback...")
    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=15,
        batch_size=16,
        shuffle=True,
        callbacks=[early_stopping]
    )

    # Save the model
    model.save(MODEL_PATH)
    print(f"Best iteration weights successfully saved to {MODEL_PATH}")
    return model

# Initialize the model weights
model = None
try:
    if os.path.exists(MODEL_PATH):
        print("Checking local model weights...")
        # Verify if loading the model works (checking for file integrity)
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Existing model weights loaded successfully.")
except Exception as e:
    print(f"Corrupt model weights detected: {e}")
    # Delete corrupt model
    if os.path.exists(MODEL_PATH):
        os.remove(MODEL_PATH)

if model is None:
    model = run_training_pipeline()

# 3. FASTAPI SERVER INITIALIZATION
app = FastAPI(title="Hydro-Acoustic Passive Sonar Inference Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/analyze-hydrophone")
async def analyze_hydrophone(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    y, sr = librosa.load(io.BytesIO(audio_bytes), sr=22050, duration=5.0)

    spectrogram = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, n_fft=2048, hop_length=512)
    log_spec = librosa.power_to_db(spectrogram, ref=np.max)

    if log_spec.shape[1] > 128:
        log_spec = log_spec[:, :128]
    elif log_spec.shape[1] < 128:
        log_spec = np.pad(log_spec, ((0, 0), (0, 128 - log_spec.shape[1])), mode="constant")

    input_tensor = np.expand_dims(np.expand_dims(log_spec, axis=-1), axis=0)

    predictions = model.predict(input_tensor, verbose=0)[0]
    return {CLASSES[i]: float(predictions[i]) for i in range(len(CLASSES))}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    print("Launching FastAPI Web Service...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
