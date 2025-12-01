import React, { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://ai-voice-bot-backend-g42v.onrender.com/api/text-interview';

// Browser APIs
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;

function App() {
  
  const [transcript, setTranscript] = useState(null); 
  
  const [statusText, setStatusText] = useState('Press START to begin recording your question.');
  const [loading, setLoading] = useState(false);   // thinking / processing
  const [listening, setListening] = useState(false); // mic active (for user question)
  const [speaking, setSpeaking] = useState(false);   // TTS playback

  const recognitionRef = useRef(null); // For user question recording
  const commandRecognitionRef = useRef(null); // For "stop" command listening (during speech)

  // Warm voices (some browsers lazy-load)
  speechSynthesis.onvoiceschanged = () => {};

  // ------------------------------
  // Core Speech Recognition Controls (Abort all operations)
  // ------------------------------

  const stopAllOperations = () => {
    // 1. Stop TTS Playback
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setSpeaking(false);

    // 2. Stop User Question Recording
    const userRec = recognitionRef.current;
    if (userRec) {
      userRec.onend = null; 
      userRec.onerror = null;
      try {
        if (typeof userRec.abort === 'function') userRec.abort();
        else userRec.stop();
      } catch { /* ignored */ }
      recognitionRef.current = null;
    }
    setListening(false);

    // 3. Stop Command Recognition
    const cmdRec = commandRecognitionRef.current;
    if (cmdRec) {
      cmdRec.onend = null;
      cmdRec.onerror = null;
      try {
        if (typeof cmdRec.abort === 'function') cmdRec.abort();
        else cmdRec.stop();
      } catch { /* ignored */ }
      commandRecognitionRef.current = null;
    }

    setLoading(false);
    setStatusText('Conversation stopped. Press START to resume.');
  };

  // ------------------------------
  // Voice Command Listener (Active only when bot is speaking)
  // ------------------------------
  const startCommandListener = () => {
    if (commandRecognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    commandRecognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let latestTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        latestTranscript += event.results[i][0].transcript;
      }

      const commandText = latestTranscript.toLowerCase();

      if (commandText.includes('please stop') || commandText.includes('stop now') || commandText.includes('stop')) {
        // Stop all voice recognition instances
        recognition.stop();
        commandRecognitionRef.current = null;
        
        // Stop TTS and reset states
        stopAllOperations();
        
        // Start listening for the user's new question
        setStatusText('Voice command "STOP" detected. Now listening for your question.');
        startRecording();
        
      } else if (commandText.includes('clear screen') || commandText.includes('clear transcript')) {
        // Stop all voice recognition instances
        recognition.stop();
        commandRecognitionRef.current = null;
        
        // Stop TTS and reset states
        stopAllOperations();
        
        // Clear the conversation history
        setTranscript(null); 
        setStatusText('Voice command "CLEAR" detected. Transcript erased. Press START to begin a new conversation.');
      }
    };

    recognition.onerror = (event) => {
      console.error('Command Recognition Error:', event.error);
      commandRecognitionRef.current = null;
    };

    recognition.onend = () => {
      commandRecognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start command listener:', e);
      commandRecognitionRef.current = null;
    }
  };

  // ------------------------------
  // LLM call + TTS
  // ------------------------------
  const handleInterview = async (userQuestion) => {
    setLoading(true);
    setStatusText('Processing... Please give me a moment.');

    try {
      const response = await axios.post(API_URL, { userQuestion });
      const { botAnswer } = response.data || {};
      const answerText = botAnswer || 'I did not receive a response.';

      // Concatenate user and bot text with double newlines (\n\n)
      setTranscript(prev => {
        const userTurn = userQuestion.trim();
        const botTurn = answerText;

  // If transcript was previously empty, initialize as array
        const history = Array.isArray(prev) ? prev : [];

        return [
          ...history,
        {
          user: userTurn,
          bot: botTurn
        }
        ];
      });

      
      setLoading(false);
      setStatusText('Answer received. Speaking now… (say "STOP" or "CLEAR SCREEN" to interrupt)');

      // Browser TTS setup
      const utterance = new SpeechSynthesisUtterance(answerText);
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

      utterance.onstart = () => {
        setSpeaking(true);
        startCommandListener();
      };
      utterance.onerror = () => {
        stopAllOperations();
        setStatusText('Playback error. Press START to try again.');
      };
      
      // CONTINUOUS LOOP: Restart listening automatically on end
      utterance.onend = () => {
        const cmdRec = commandRecognitionRef.current;
        if (cmdRec) {
          cmdRec.onend = null;
          try { cmdRec.stop(); } catch { /* ignored */ }
          commandRecognitionRef.current = null;
        }

        setSpeaking(false);
        setStatusText('Response complete. Now listening for your follow-up question...');
        startRecording();
      };

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Interview Request Failed:', error);
      const errorMessage = error.response?.data?.error || error.message;
      setStatusText(`ERROR: ${errorMessage}. Check console and API key.`);
      stopAllOperations();
    }
  };

  // ------------------------------
  // Speech Recognition (User Question) control
  // ------------------------------
  const startRecording = () => {
    if (!SpeechRecognition) {
      setStatusText('Error: Speech Recognition not supported in this browser.');
      return;
    }

    if (speechSynthesis.speaking || commandRecognitionRef.current) {
      stopAllOperations();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    let fullTranscript = "";

    recognition.onstart = () => {
      setStatusText('🔴 Listening... Speak your full question clearly.');
      setLoading(true);
      setListening(true);
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech Recognition Error:', event.error);
      setStatusText(`Speech Error: ${event.error}. Conversation loop ended.`);
      setLoading(false);
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      
      if (fullTranscript.trim().length > 0) {
        setStatusText('Processing your follow-up question...');
        handleInterview(fullTranscript.trim());
      } else {
        // Loop terminates on silence/timeout
        setStatusText('No voice detected. Conversation loop ended. Press START to resume.');
        setLoading(false);
      }
    };

    recognition.start();
  };

  const stopRecording = () => {
    stopAllOperations();
  };

  // ------------------------------
  // Clear Transcript
  // ------------------------------
  const clearTranscript = () => {
    // 1. Stop any ongoing operations (TTS or listening)
    stopAllOperations();

    // 2. Clear the transcript state
    setTranscript(null);
    
    // 3. Update status
    setStatusText('Transcript erased. Press START to begin a new conversation.');
  };

  // ------------------------------
  // JSX RENDERER
  // ------------------------------
  return (
    <div className="app-container">
      <h1>🤖 100x AI Agent Voice Interview</h1>
      <p className="subtitle">Start a Conversation 😄</p>

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
          START CONVERSATION
        </button>
        <button
          onClick={stopRecording}
          disabled={(!listening && !speaking) || !SpeechRecognition}
          className="control-button stop"
        >
          STOP CONVERSATION
        </button>

        <button
          onClick={clearTranscript}
          disabled={!transcript}
          className="control-button clear"
          style={{ marginLeft: '10px', marginTop: '12px' }}
        >
          CLEAR TRANSCRIPT
        </button>

        
        <p className="mic-instruction">
            Click START. The conversation will continue until you are silent or use a voice command (e.g. "STOP" & "CLEAR"). 
            <br />
            You can also click STOP or CLEAR TRANSCRIPT.
        </p>

      </div>

      {Array.isArray(transcript) && transcript.length > 0 && (
  <div className="transcript-box">
    <h2>Conversation Transcript</h2>

    {transcript.map((pair, index) => (
      <div key={index} className="message-pair">
        
        <div className="message user-message">
          <strong>You Asked:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {pair.user}
          </pre>
        </div>

        <div className="message bot-message">
          <strong>Candidate Responds:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {pair.bot}
          </pre>
        </div>

        <hr />
      </div>
    ))}
  </div>
)}


      <p className="disclaimer">✅ The Interview Bot That Actually ListenS.</p>
    </div>
  );
}

export default App;