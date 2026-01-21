# SDP Q2 – Generative Translation (LLM-based)

This project implements a **local, LLM-based automatic GUI translation system**.

It consists of:

- a **TypeScript auto-translation library** (DOM observer + batching)
- a **React demo app**
- a **local Python backend** connected to **llama.cpp**
- a **locally hosted LLaMA model** (no cloud APIs)

The system automatically detects visible UI text and translates it **on the fly**, irrespective of the original source language.

---

## Repository Structure

DO NOT CONSIDER MT FOLDER, NOT AN ACTUAL LLM, OLD IMPLEMENTATION

```
.
├── apps/
│   ├── web/                  # React demo app
│   │   └── src/
│   │       └── auto-translator/   # Auto-translation library (TS)
│   └── llm/                  # Python backend (FastAPI)
│       ├── main.py
│       └── server.py
├── pnpm-workspace.yaml
└── README.md
```

---

## Requirements

### System

- Windows / Linux
- GPU recommended (CUDA)

### Software

- **Node.js** ≥ 18
- **pnpm**
- **Python** ≥ 3.10
- **llama.cpp** (compiled with server support)

---

## Step 1 — Download the LLaMA Model

Download a **GGUF Instruct model** from Hugging Face.

Recommended (used in this project):

```
Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf
```

Source:
https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF

Go to Files and versions and download exactly:

```text
Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf
```

Place the file somewhere on your machine, e.g.:

```
C:\models\llama3\Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf
```

or (Linux / macOS):

```text
~/models/llama3/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf
```

---

## Step 2 — Build and Run llama.cpp Server

You must build `llama.cpp` with server support.

### Step 2.1 Clone and Build llama.cpp

llama.cpp is not included in this repository and must be built separately.

From any directory outside this repo:

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
```

#### Option A - Build with CUDA acceleration:

- Requires: NVIDIA GPU
- CUDA toolkit available at build time

```bash
mkdir build
cd build
cmake .. -DLLAMA_CUDA=ON
cmake --build . --config Release
```

#### Option B - CPU-only build:

- This option does NOT require CUDA and works on all machines

```bash
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

After a successful build, you should see:

```text
build/bin/llama-server
or
build/bin/Release/llama-server
```

(or `llama-server.exe` on Windows)

### Step 2.2 Run the LLaMA Server

From the llama.cpp build directory, run:

- Note: Replace `C:\models\llama3\` with the path where you downloaded the model.

#### Option A - CUDA build

Use this command only if `llama.cpp` was built with CUDA support.

```bash
.\llama-server.exe `
  -m C:\models\llama3\Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf `
  --port 7001 `
  --ctx-size 4096 `
  --n-gpu-layers 999
```

This offloads all model layers to the GPU for maximum performance.

#### Option B - CPU-only build

If `llama.cpp` was built without CUDA, run the server without GPU flags:

```bash
.\llama-server.exe `
  -m C:\models\llama3\Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf `
  --port 7001 `
  --ctx-size 4096
```

#### Notes

- `--n-gpu-layers` requires a CUDA-enabled build

- CPU-only builds must not use GPU-related flags

- If a CUDA build is used but no compatible GPU is found at runtime,
  the server automatically falls back to CPU execution

- Leave this terminal running

If successful, the LLM server will be available at:

```
http://localhost:7001
```

---

## Step 3 — Run the Python Backend

Navigate to the backend folder:

```bash
cd apps/llm
```

Install dependencies:

```bash
pip install fastapi uvicorn requests
```

Run the backend:

```bash
uvicorn main:app --port 8001
```

Health check:

```
http://localhost:8001/health
```

---

## Step 4 — Install Frontend Dependencies

From the **project root**:

```bash
pnpm install
```

(if no pnpm available, feel free to use your preferred package manager)

## Step 5 — Run the Web App

From the project root:

```bash
pnpm --filter web dev
```

Alternatively:

```bash
cd apps/web
pnpm dev
```

The app will be available at:

```
http://localhost:5173
```

---

## How the System Works

Full system documentation (architecture, configs, limitations): `docs/SYSTEM.md`.

### Frontend (Auto Translator)

- Observes DOM mutations
- Detects new text nodes and placeholders
- Batches text efficiently
- Sends translation requests to backend
- Injects translated text back into the DOM
- Prevents re-translation loops

Language can be changed at runtime via the UI selector.

---

### Backend (LLM Translation)

- FastAPI server
- Receives translation batches
- Calls local llama.cpp server
- Forces **pure translation output**
- No explanations, no JSON, no tool calls

---

## Important Notes

- **No cloud APIs are used**
- **Everything runs locally**
- Source language is auto-detected
- Target language is user-selected
- Translation is performed at runtime on visible UI text

---

## For the Exam / Evaluation

To test the project, the evaluator must:

1. Download a GGUF LLaMA model
2. Run `llama-server`
3. Run the Python backend
4. Run the React app

This setup demonstrates:

- local LLM usage
- real-time UI translation
- clean separation of frontend / backend
- library-style frontend architecture

---

## License

Academic / educational use only.
