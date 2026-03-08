import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export type LiveState = 'disconnected' | 'connecting' | 'connected';

export interface UseLiveAPIOptions {
  systemInstruction: string;
  tools?: any[];
  onMessage?: (message: LiveServerMessage) => void;
  onClose?: () => void;
  onError?: (error: any) => void;
}

export function useLiveAPI({ systemInstruction, tools, onMessage, onClose, onError }: UseLiveAPIOptions) {
  const [liveState, setLiveState] = useState<LiveState>('disconnected');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const nextPlayTimeRef = useRef(0);
  const liveStateRef = useRef<LiveState>('disconnected');

  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);

  const connect = useCallback(async () => {
    try {
      setLiveState('connecting');
      
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY");
      
      const ai = new GoogleGenAI({ apiKey });

      // Setup audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      await audioContextRef.current.resume();

      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1,
        sampleRate: 16000,
      } });
      audioStreamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          outputAudioTranscription: {},
          systemInstruction,
          tools,
        },
        callbacks: {
          onopen: () => {
            liveStateRef.current = 'connected';
            setLiveState('connected');

            processor.onaudioprocess = (e) => {
              if (liveStateRef.current !== 'connected') return;

              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32Array to Int16Array
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }

              // Convert to base64
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true); // true for little-endian
              }

              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Data = btoa(binary);

              if (liveStateRef.current === 'connected') {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              }
            };
          },
          onmessage: (message: LiveServerMessage) => {
            if (onMessage) onMessage(message);

            // Handle audio playback
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryString = atob(base64Audio);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
              }

              playbackQueueRef.current.push(float32Array);

              if (audioContextRef.current) {
                const audioCtx = audioContextRef.current;
                if (nextPlayTimeRef.current < audioCtx.currentTime) {
                  nextPlayTimeRef.current = audioCtx.currentTime + 0.05;
                }

                while (playbackQueueRef.current.length > 0) {
                  const audioData = playbackQueueRef.current.shift()!;
                  const audioBuffer = audioCtx.createBuffer(1, audioData.length, 24000); // Output is 24kHz
                  audioBuffer.getChannelData(0).set(audioData);

                  const source = audioCtx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(audioCtx.destination);
                  source.start(nextPlayTimeRef.current);

                  nextPlayTimeRef.current += audioBuffer.duration;
                }
              }
            }

            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              if (audioContextRef.current) {
                nextPlayTimeRef.current = audioContextRef.current.currentTime || 0;
              }
            }
          },
          onclose: () => {
            liveStateRef.current = 'disconnected';
            setLiveState('disconnected');
            if (onClose) onClose();
          },
          onerror: (error) => {
            console.error("Live API Error:", error);
            liveStateRef.current = 'disconnected';
            setLiveState('disconnected');
            if (onError) onError(error);
          }
        }
      });

      sessionRef.current = session;

    } catch (err) {
      console.error("Failed to connect:", err);
      setLiveState('disconnected');
      if (onError) onError(err);
    }
  }, [systemInstruction, tools, onMessage, onClose, onError]);

  const disconnect = useCallback(() => {
    liveStateRef.current = 'disconnected';
    setLiveState('disconnected');
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    playbackQueueRef.current = [];
    nextPlayTimeRef.current = 0;
    
    if (sessionRef.current) {
      try {
        if (sessionRef.current.close) sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
  }, []);

  const sendImage = useCallback((base64Data: string, mimeType: string = 'image/jpeg') => {
    if (sessionRef.current && liveStateRef.current === 'connected') {
      sessionRef.current.sendRealtimeInput({
        media: { data: base64Data, mimeType }
      });
    }
  }, []);

  const sendToolResponse = useCallback((functionResponses: any[]) => {
    if (sessionRef.current && liveStateRef.current === 'connected') {
      sessionRef.current.sendToolResponse({ functionResponses });
    }
  }, []);

  return {
    liveState,
    connect,
    disconnect,
    sendImage,
    sendToolResponse
  };
}
