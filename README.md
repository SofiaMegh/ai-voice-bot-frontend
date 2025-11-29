# 🎨 Frontend Overview

This frontend is a fully interactive **voice-driven AI interview UI**, running entirely in the browser with real-time speech input, speech output, interruption commands, and memory awareness.

To keep everything fast and globally accessible, I deployed it on **Netlify**, while the backend runs on **Render**.

---

## 🚀 Features

### 🎤 **1. Real-time Voice Interaction**
- Start speaking anytime — the bot listens using browser SpeechRecognition.
- The bot responds using high-quality browser TTS.
- Automatic conversation looping (you talk ➝ bot replies ➝ listens again).

### 🛑 **2. Voice Interruption (Command Recognition)**
You can interrupt the bot **mid-sentence** using your voice: Commands supported: 
* **“stop”**
* **“please stop”**
* **“stop now”**
* **“clear transcript”**
* **“clear screen”**

The system instantly: 
- ✔ Stops TTS 
- ✔ Stops all recognizers 
- ✔ Cancels pending operations 
- ✔ Resets the loop and listens for the next question 
- ✔ (If clear) wipes the entire transcript 

Feels like a real smart assistant.

### 🧠 **3. Short-Term Memory (Redis)**
The bot remembers:
- Your previous questions  
- Its own previous answers  

### 📚 **4. Long-Term Memory (Supabase)**
The system extracts **stable candidate facts** from each turn and stores them as durable memory:
- Skills  
- Experience  
- Goals  
- Personal attributes  

### 🔊 **5. Browser TTS with Natural Voice Selection**
Auto-selects best available:
- Google US English Female  
- Samantha  
- UK English Female  
- Falls back to pitch-tuned default if needed.

---

## 🚀 Why Netlify (Frontend)?

I chose **Netlify** because:

* It’s insanely fast on a global CDN
* Perfect for React builds
* Zero-config deployment
* Automatic HTTPS
* No cold starts
* Works beautifully with browser speech features

Just push the build → Netlify serves it instantly.
Perfect for a voice UI that needs low latency.

---

## 🚀 Why Render (Backend)?

I used **Render** for the backend because:

* It handles long-running Node processes better than serverless
* No function timeouts
* Stable TTS + LLM calls
* Simple environment variable management
* Easy auto-redeploy from GitHub

Render keeps the API alive, while Netlify keeps the UI blazing fast.
A clean, reliable pair.

---

### 🔥 The Big Win

By avoiding WebRTC and serverless complications, I built a **stable, browser-first architecture**:

* Netlify serves the UI instantly
* Render handles all backend logic
* Browser handles all realtime voice work

Simple, stable, scalable — and cheaper than any WebRTC-based setup.

---

