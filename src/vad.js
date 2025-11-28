import { MicVAD } from "@ricky0123/vad";

// Creates a microphone VAD detector
export function createVAD(onVoiceStart) {
  return MicVAD.new({
    onSpeechStart: () => {
      console.log("🎤 User is speaking — INTERRUPT TTS!");
      onVoiceStart();
    },
    onSpeechEnd: () => {
      console.log("User stopped speaking");
    },
  });
}
