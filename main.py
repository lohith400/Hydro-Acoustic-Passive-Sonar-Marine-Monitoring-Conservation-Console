# main.py — Fully Integrated Hydro-Acoustic Inference Pipeline & API
import io
import os
import glob
import librosa
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sklearn.model_selection import train_test_split
from tensorflow.keras import layers, models, callbacks

# =====================================================================
# 1. FORCE LOCAL CONFIGURATION WITH MEMORY GROWTH
# =====================================================================
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print("Local integrated hardware acceleration configured successfully.")
    except RuntimeError as e:
        print(f"Hardware initialization flag error: {e}")

# Switched to native zip compressed .keras extension to avoid legacy HDF5 pointer bugs on Windows
MODEL_PATH = "acoustic_classifier.keras"
CLASSES = ["Container_Ship", "Marine_Mammal"]

# =====================================================================
# 2. LOCAL-ONLY DATA PROCESSING & BALANCED TRAINING PIPELINE
# =====================================================================
def run_training_pipeline():
    print("--------------------------------------------------------------------------------")
    print("MODEL FILE MISSING OR INVALID. STARTING LOCAL TENSOR TRANSLATION PIPELINE...")
    print("--------------------------------------------------------------------------------")

    # Target your manually populated local data directories directly
    base_data_dir = "./real_raw_data"
    ship_dir = os.path.join(base_data_dir, "ships")
    mammal_dir = os.path.join(base_data_dir, "mammals")

    # Gather all pre-staged local audio file list arrays cleanly
    ship_files = sorted(glob.glob(os.path.join(ship_dir, "*.wav")))
    mammal_files = sorted(glob.glob(os.path.join(mammal_dir, "*.wav")))

    print(f"Verified Local Ship Files Found Across Directory   : {len(ship_files)}")
    print(f"Verified Local Mammal Files Found Across Directory : {len(mammal_files)}")

    if len(ship_files) == 0 or len(mammal_files) == 0:
        raise ValueError(
            "Deficit Error: One or both directories inside './real_raw_data' are empty. "
            "Verify files are unzipped directly inside the /ships and /mammals folders."
        )

    # Modular feature extraction function to compute uniform square log-Mel matrix tensors
    def process_audio_file(file_path, label, chunk_duration=5.0, target_sr=22050):
        X, y = [], []
        samples_per_chunk = int(chunk_duration * target_sr)
        try:
            audio_data, sr = librosa.load(file_path, sr=target_sr)
        except Exception as e:
            print(f"Skipping unreadable clip path {file_path}: {e}")
            return X, y

        for start in range(0, len(audio_data), samples_per_chunk):
            chunk = audio_data[start:start + samples_per_chunk]
            if len(chunk) == samples_per_chunk:
                melspec = librosa.feature.melspectrogram(
                    y=chunk, sr=target_sr, n_mels=128, n_fft=2048, hop_length=512
                )
                log_melspec = librosa.power_to_db(melspec, ref=np.max)

                # Strictly pad or crop dimensions to an exact (128, 128) profile matrix grid
                if log_melspec.shape[1] > 128:
                    log_melspec = log_melspec[:, :128]
                elif log_melspec.shape[1] < 128:
                    log_melspec = np.pad(
                        log_melspec, ((0, 0), (0, 128 - log_melspec.shape[1])), mode="constant"
                    )
                X.append(log_melspec)
                y.append(label)
        return X, y

    print("Extracting acoustic features (Generating 2D Log-Mel Spectrograms)...")
    X_ships, y_ships = [], []
    for f in ship_files:
        X_file, y_file = process_audio_file(f, label=0)
        X_ships.extend(X_file)
        y_ships.extend(y_file)

    X_mammals, y_mammals = [], []
    for f in mammal_files:
        X_file, y_file = process_audio_file(f, label=1)
        X_mammals.extend(X_file)
        y_mammals.extend(y_file)

    # CRITICAL CLASS BALANCING STEP: Crop sample matrices evenly to fix model classification bias
    min_chunks = min(len(X_ships), len(X_mammals))
    print(f"Balancing database pools... Slicing arrays to exactly {min_chunks} entries per class.")
    
    X_ships, y_ships = X_ships[:min_chunks], y_ships[:min_chunks]
    X_mammals, y_mammals = X_mammals[:min_chunks], y_mammals[:min_chunks]

    # Combine data structures into structured NumPy tensor blocks
    X_real = np.array(X_ships + X_mammals)
    y_real = np.array(y_ships + y_mammals)
    X_real = np.expand_dims(X_real, axis=-1)

    print(f"Balanced Array Final Footprint ready. Shape: {X_real.shape}")
    print(f"Class Weights -> Container Ships (0): {(y_real==0).sum()} | Marine Mammals (1): {(y_real==1).sum()}")

    # Stratify split ensures perfectly distributed training evaluations
    X_train, X_val, y_train, y_val = train_test_split(
        X_real, y_real, test_size=0.2, random_state=42, stratify=y_real
    )

    print("Compiling 2D Convolutional Neural Network (CNN) Layers...")
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

    # Early stopping config to sync with your original notebook validation profiles
    early_stopping = callbacks.EarlyStopping(
        monitor='val_loss',
        patience=3,
        restore_best_weights=True,
        verbose=1
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

    # Save finalized network structures
    model.save(MODEL_PATH)
    print(f"Peak iteration weights successfully saved to disk as: {MODEL_PATH}")
    return model

# Initialize or verify pre-existing local model state weights on runtime startup
model = None
try:
    if os.path.exists(MODEL_PATH):
        print("Checking local model weights...")
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Existing model weights loaded successfully.")
except Exception as e:
    print(f"Corrupt weights encountered: {e}. Rebuilding arrays.")
    if os.path.exists(MODEL_PATH):
        os.remove(MODEL_PATH)

if model is None:
    model = run_training_pipeline()

# =====================================================================
# 3. PRODUCTION FASTAPI SERVICE & WEB ENDPOINT ROUTING
# =====================================================================
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
    # Intercept raw binary buffers cleanly across network streams
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
    print("Launching FastAPI Web Service Operations...")
    # Disabled the auto-reloader to protect Windows memory threads from model locking loops
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)