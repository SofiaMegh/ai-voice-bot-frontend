## 🎨 Frontend Overview

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

### Challenges:

One of the first hurdles I ran into was Whisper. I originally wanted to use it for real-time transcription because of its accuracy, but Whisper immediately hit me with paywalls — it isn’t available on the free tier, requires billing just to test properly, and would’ve made continuous voice loops ridiculously expensive. To keep the project lean and deployable on Netlify, I switched to the browser’s native SpeechRecognition. It gave me real-time speech capture, zero cost, no rate limits, and fast detection right inside the browser — perfect for a frontend-driven voice interface.

The next battle was the OpenAI Realtime API. On paper it sounded perfect, but in practice it was pure WebRTC chaos — constant socket management, bidirectional streams, event syncing, NAT headaches, and random breakages. WebRTC fought with everything I needed: quick restarts, lightweight deployment, and interruptibility. Instead of wrestling WebRTC forever, I dropped it and built a browser-first flow: one recognizer for questions, one recognizer just for interrupt commands, and a clean speech → LLM → speech loop powered by my Render backend and served through Netlify. It was simpler, sturdier, and far more predictable.

Then came the hardest challenge of all: voice interruption. When the bot speaks through speechSynthesis, the browser blocks SpeechRecognition completely — meaning you can’t talk over the bot, can’t interrupt, can’t stop it mid-sentence. This is a browser limitation, not an error. To fix it, I engineered my own override system: during TTS playback, I launch a second recognizer that listens *only* for commands like “stop” or “clear.” If it hears one, it instantly cancels TTS, shuts down both recognizers, resets state, and starts listening again. It feels exactly like interrupting Alexa or Google Assistant — smooth, natural, and instant.

Another challenge was building a reliable memory system using Redis and Supabase while keeping everything compatible with my Render backend. Redis gives the bot short-term memory across turns, and Supabase stores long-term traits, but syncing both in a voice loop required careful planning: connection handling, cold-start behavior, and ensuring the memory stays consistent across requests. With the right structure, both layers now work in harmony.

Finally, I had to fight browser conflicts. Browsers absolutely hate running SpeechRecognition and speechSynthesis at the same time. They stop each other, cancel events, freeze, or restart unpredictably — especially on Chrome. To stabilize everything, I built a coordination layer that manages who’s allowed to speak or listen at any given moment. A unified `stopAllOperations()` kills all active tasks instantly, recognizers are cleaned up after every cycle, and the loop restarts intelligently after each event. This stopped all random glitches and made the system feel buttery-smooth.

