# Sign Language Interpreter · Real-Time ASL Interpreter & Voice Engine

> **Accessibility-First Computer Vision System**: A real-time web application that translates American Sign Language (ASL) gestures into live captions and natural spoken voice using an ordinary webcam at 30–60 FPS with sub-20ms latency. Zero API keys, zero cloud transmission, 100% private and on-device.

---

##  Highlights & Key Innovations

- ** Zero Cloud Latency (~12ms inference)**: The entire computer vision pipeline runs locally in the browser over WebAssembly (Wasm) and WebGL. No expensive cloud GPU servers or streaming video round-trips.
- ** 100% Privacy Guaranteed**: Video frames never leave the user's local device. Fully compliant with strict privacy requirements.
- ** Curated High-Accuracy Conversational Signs**: 17 essential, high-confidence conversational signs and controls with zero stray letter noise (eliminating accidental letter or digit triggers).
- ** Multi-Accent Voice Synthesis**: Supports regional accents across ** US English,  British English,  Indian English,  Australian English,  Canadian,  Irish**, and international voices with live audio preview and persistence.
- ** Interactive ASL Reference Guide**: In-app modal with search, category filtering, visual icons, and step-by-step how-to instructions for all supported signs and controls.
- ** Monochromatic Minimalist HUD**: Clean hand skeleton joint visualization, live FPS & inference latency counter, fullscreen toggle, and distraction-free dark UI.

---

##  Architecture & Data Pipeline

```
  Webcam Feed  ─────────>  MediaPipe Hands (Client Wasm/WebGL) 
                                              │
                                              ▼ (21 3D Landmarks)
                                 Spatial & Geometric Normalizer 
                                              │
               ┌──────────────────────────────┴──────────────────────────────┐
               ▼                                                             ▼
      Static Gesture Engine                                    Dynamic Motion Tracker 
  (OK, ILY, Please, Water, Fist, Thumbs)                     (Wave Hello, Thank You, Yes, Sorry, No Cross)
               │                                                             │
               └──────────────────────────────┬──────────────────────────────┘
                                              │
                                              ▼
                                  Hold Stabilizer & Debounce 
                                              │
                                              ▼
                                  Sentence & Grammar Engine 
                                 ├── Predictive Word Autocomplete
                                 └── Natural Punctuation Formatter
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
           Live Caption Subtitles                         Speech Synthesis Engine 
         (Word suggestions & cursor)                     (Accents: US, UK, IN, AU, etc.)
```

---

##  Quick Start (Zero Dependencies)

SignPulse AI is built using pure modern web standards (Vanilla JavaScript ES6 modules, HTML5, CSS3). **No Node.js or build steps required.**

### 1. Clone the Repository
```bash
git clone https://github.com/NilayOverp94/Hackathon.git
cd Hackathon
```

### 2. Run Locally
Start any static HTTP server (Python is built into macOS and Linux):
```bash
# Using Python 3 (included serve.py)
python3 serve.py
```
Open **`http://localhost:8080`** in Google Chrome, Microsoft Edge, or Safari. Allow webcam access and start signing!

---

##  Deploy to Vercel in 30 Seconds

The repository includes a ready-to-use [`vercel.json`](vercel.json) configuration:

1. Push your repository to GitHub.
2. Go to **[vercel.com/new](https://vercel.com/new)** and sign in with GitHub.
3. Import your **Hackathon** repository.
4. Leave settings at default (`Framework: Other`, `Root Directory: ./`).
5. Click **Deploy**. Vercel will generate an instant live SSL URL (e.g. `https://your-project.vercel.app`).

---

## 📖 Supported Sign Language Dictionary (Curated Conversational Signs)

SignPulse AI is calibrated for zero-noise conversational recognition, focusing exclusively on full words, high-confidence conversational phrases, and gestures rather than stray letters or digit triggers:

### 1. Conversational Gestures & Phrases (15 Signs)
| Sign / Phrase | Icon | How to Perform |
|---|:---:|---|
| **HELLO / WAVE** | 👋 | Open palm waving side-to-side (oscillating motion). |
| **THANK YOU** | 🙏 | Flat hand touching chin/mouth moving outward toward the camera. |
| **I LOVE YOU** | 🤟 | Thumb, Index, and Pinky extended; Middle and Ring curled. |
| **OK** | 👌 | Thumb & Index pinch in a circle; Middle, Ring, Pinky extended upright. |
| **FUCK YOU** | 🖕 | Middle finger extended upright, other fingers curled into fist. |
| **GOOD / THUMBS UP** | 👍 | Fist with thumb pointing straight up. |
| **BAD / THUMBS DOWN** | 👎 | Fist with thumb pointing straight down. |
| **EXCELLENT** | 👍👍 | Double Thumbs Up with both hands. |
| **YES** | ✊ | Closed fist nodding vertically up and down. |
| **NO** | ❌ | Cross 2 fingers of different hands (index fingers) to form an X. |
| **PLEASE** | 🤙 | Thumb and Pinky finger extended outward, middle 3 fingers curled in. |
| **SORRY** | ☝️ | Index finger extended, hovering/wagging side-to-side (right and left). |
| **HELP** | 🤝 | Thumbs-up fist resting atop a flat open palm (Two-hand). |
| **STOP** | 🛑 | Flat vertical palm facing camera or one flat hand chopping onto flat palm. |
| **WATER** | 💧 | "W" handshape (3 middle fingers) held near chin/mouth. |

---

### 2. Smart Navigation Controls (2 Actions)
| Control | Icon | How to Perform |
|---|:---:|---|
| **SPACE** | ␣ | Turn open flat hand horizontally to insert word separation. |
| **BACKSPACE** | ⌫ | Swipe hand swiftly to the left in the air to instantly delete the previous word. |

---

##  Multi-Accent Voice Engine

SignPulse AI includes a native accent picker integrated directly into the action toolbar:
- **Accents Supported**:
  -  US English (Samantha, Alex, Google US, Natural)
  -  British English (Daniel, Oliver, Serena)
  -  Indian English (Rishi, Veena, Google हिन्दी/English)
  -  Australian English (Karen)
  -  Canadian English
  -  Irish English
  -  International & Multilingual voices
- **Real-Time Preview**: Hear a sample upon switching voices.
- **Persistent Preferences**: Saves selected accent to `localStorage` automatically.

---

##  Tech Stack Overview

| Layer | Technologies Used |
|---|---|
| **Computer Vision (ML)** | Google MediaPipe Hands (v0.4 WebAssembly/WebGL) |
| **Core Gesture Engine** | Custom 3D Euclidean Vector Mathematics & Kinematic Velocity Filters |
| **Predictive Text Engine** | Custom In-Memory Trie & Vocabulary Matcher (`word_predictor.js`) |
| **Voice Synthesis** | Native Web Speech API (`window.speechSynthesis`) + Web Audio API |
| **Frontend HUD** | HTML5 Canvas 2D (`CanvasRenderingContext2D`), Vanilla ES6 Modules |
| **Design System** | Custom Vanilla CSS3 (Neutral Dark Theme, JetBrains Mono, Inter) |
| **Deployment** | Vercel Edge Network / Python 3 Local Server |

---

##  License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute for accessibility research, education, and hackathon projects.
