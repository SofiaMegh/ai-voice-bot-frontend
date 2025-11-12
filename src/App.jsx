import React, { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://ai-voice-bot-api.onrender.com/api/text-interview';

// Browser APIs
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;

function App() {
  const [statusText, setStatusText] = useState('Press START to begin recording your question.');
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(false);   // thinking / processing
  const [listening, setListening] = useState(false); // mic active
  const [speaking, setSpeaking] = useState(false);   // TTS playback

  const recognitionRef = useRef(null);

  // Warm voices (some browsers lazy-load)
  speechSynthesis.onvoiceschanged = () => {};

  // ------------------------------
  // LLM call + TTS
  // ------------------------------
  const handleInterview = async (userQuestion) => {
    setLoading(true);
    setStatusText('Processing... Sending question to Gemini LLM.');

    try {
      const response = await axios.post(API_URL, { userQuestion });
      const { botAnswer } = response.data || {};

      setTranscript({ user: userQuestion, bot: botAnswer || '' });

      // Done "loading"; about to speak
      setLoading(false);
      setStatusText('Answer received. Speaking now… (press STOP to interrupt)');

      // Browser TTS
      const utterance = new SpeechSynthesisUtterance(botAnswer || 'I did not receive a response.');
      const voices = speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(v => v.name.includes('Google US English Female')) ||
        voices.find(v => v.name.includes('Samantha')) ||
        voices.find(v => v.name.includes('Google UK English Female')) ||
        voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      } else {
        utterance.pitch = 1.1;
        utterance.rate = 0.9;
      }

      if (speechSynthesis.speaking) speechSynthesis.cancel();

      utterance.onstart = () => setSpeaking(true);
      utterance.onerror = () => {
        setSpeaking(false);
        setStatusText('Playback error. Press START to try again.');
      };
      utterance.onend = () => {
        setSpeaking(false);
        setStatusText('Response complete. Press START to ask another question.');
        setListening(false);
      };

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Interview Request Failed:', error);
      const errorMessage = error.response?.data?.error || error.message;
      setStatusText(`ERROR: ${errorMessage}. Check console and API key.`);
      setTranscript(null);
      setLoading(false);
      setListening(false);
      setSpeaking(false);
    }
  };

  // ------------------------------
  // Speech Recognition control
  // ------------------------------
  const startRecording = () => {
  if (!SpeechRecognition) {
    setStatusText('Error: Speech Recognition not supported in this browser.');
    return;
  }

  // Stop any current speech output before listening
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    setSpeaking(false);
  }

  setTranscript(null);

  const recognition = new SpeechRecognition();
  recognition.continuous = false; // capture one full phrase
  recognition.interimResults = false; // wait until final result
  recognition.lang = 'en-US';
  recognitionRef.current = recognition;

  let fullTranscript = ""; // gather entire user speech

  recognition.onstart = () => {
    setStatusText('🔴 Listening... Speak your full question clearly.');
    setLoading(true);
    setListening(true);
  };

  // build transcript progressively
  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      fullTranscript += event.results[i][0].transcript;
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech Recognition Error:', event.error);
    setStatusText(`Speech Error: ${event.error}. Try again.`);
    setLoading(false);
    setListening(false);
    recognitionRef.current = null;
  };

  // wait until recognition stops naturally (user finishes speaking)
  recognition.onend = () => {
    if (fullTranscript.trim().length > 0) {
      setStatusText('Processing your full question...');
      handleInterview(fullTranscript.trim());
    } else {
      setStatusText('No voice detected. Try again.');
      setLoading(false);
    }
    setListening(false);
    recognitionRef.current = null;
  };

  recognition.start();
};

  // Instant stop; also interrupts TTS
  const stopRecording = () => {
    const rec = recognitionRef.current;

    // Always allow interrupting playback
    if (speechSynthesis.speaking || speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      setStatusText('Playback stopped. Press START to ask another question.');
      // continue to stop SR if it’s running
    }

    if (!rec) {
      setListening(false);
      setLoading(false);
      return;
    }

    // Block any late result from triggering the LLM
    rec.onresult = null;

    rec.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setLoading(false);
      if (!speaking) setStatusText('Stopped. Press START to ask another question.');
    };
    rec.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
      setLoading(false);
      if (!speaking) setStatusText('Stopped. Press START to ask another question.');
    };

    try {
      if (typeof rec.abort === 'function') rec.abort(); // immediate
      else rec.stop();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setLoading(false);
    }

    // Failsafe for engines that skip onend after abort()
    setTimeout(() => {
      if (recognitionRef.current) return;
      setListening(false);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="app-container">
      <h1>🤖 100x AI Agent Voice Interview</h1>
      <p className="subtitle">Ask a Question</p>

      <div className="status-area">
        <p><strong>Status:</strong> {statusText}</p>
        {loading && <div className="spinner"></div>}
      </div>

      <div className="recorder-area">
        <button
          onClick={startRecording}
          disabled={listening || loading || speaking || !SpeechRecognition}
          className="control-button start"
        >
          START RECORDING
        </button>
        <button
          onClick={stopRecording}
          disabled={(!listening && !speaking) || !SpeechRecognition}
          className="control-button stop"
        >
          STOP LISTENING
        </button>
        <p className="mic-instruction">
          Click START, speak clearly. You can press STOP to interrupt recording or playback.
        </p>
      </div>

      {transcript && (
        <div className="transcript-box">
          <h2>Conversation Transcript</h2>
          <div className="message user-message">
            <strong>You Asked:</strong> {transcript.user}
          </div>
          <div className="message bot-message">
            <strong>Candidate Responds:</strong> {transcript.bot}
          </div>
        </div>
      )}

      <p className="disclaimer">✅ The Interview Bot That Actually Listens.</p>
    </div>
  );
}

export default App;
