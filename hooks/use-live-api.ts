import { useState, useRef, useCallback, useEffect } from 'react';
import { LiveServerMessage, Modality, Tool } from '@google/genai';
import { getGenAI } from '@/lib/genai';
import { MODELS, AUDIO } from '@/lib/constants';

import type { LiveState } from '@/lib/types';
export type { LiveState } from '@/lib/types';

export interface UseLiveAPIOptions {
  systemInstruction: string;
  tools?: Tool[];
  onMessage?: (message: LiveServerMessage) => void;
  onClose?: () => void;
  onError?: (error: unknown) => void;
}

// Encode a buffer to base64 in chunks to avoid O(n²) string concat and call-stack overflow.
function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function useLiveAPI({ systemInstruction, tools, onMessage, onClose, onError }: UseLiveAPIOptions) {
  const [liveState, setLiveState] = useState<LiveState>('disconnected');

  // Use refs for callbacks so they never stale-close over old values and don't
  // cause `connect` to be recreated on every render.
  const onMessageRef = useRef(onMessage);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const sessionRef = useRef<any>(null);
  const liveStateRef = useRef<LiveState>('disconnected');

  // Separate contexts: 16kHz for mic capture, native rate for playback.
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef(0);

  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);

  const connect = useCallback(async () => {
    try {
      setLiveState('connecting');

      const ai = getGenAI();

      // 16kHz input context for mic capture.
      inputAudioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: AUDIO.SAMPLE_RATE_INPUT });
      await inputAudioContextRef.current.resume();

      // Native-rate output context for high-quality 24kHz playback.
      outputAudioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      await outputAudioContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: AUDIO.SAMPLE_RATE_INPUT } });
      audioStreamRef.current = stream;

      const source = inputAudioContextRef.current.createMediaStreamSource(stream);
      // ScriptProcessorNode is deprecated but AudioWorklet requires a separate file;
      // functional for current targets.
      const processor = inputAudioContextRef.current.createScriptProcessor(AUDIO.PROCESSOR_BUFFER_SIZE, 1, 1);
      processorRef.current = processor;
      // Route mic → processor → silent gain (not speakers).
      // ScriptProcessorNode must be connected to something to fire onaudioprocess,
      // but connecting to destination would play raw mic audio back through speakers
      // and create a feedback loop where Gemini hears its own output.
      const silentGain = inputAudioContextRef.current.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(inputAudioContextRef.current.destination);

      const session = await ai.live.connect({
        model: MODELS.VOICE_DM,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
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
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }

              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true);
              }

              session.sendRealtimeInput({
                media: { data: encodeBase64(buffer), mimeType: 'audio/pcm;rate=16000' },
              });
            };
          },

          onmessage: (message: LiveServerMessage) => {
            onMessageRef.current?.(message);

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const audioCtx = outputAudioContextRef.current;
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
              }

              // Schedule playback. Use <= to handle exact-boundary timing.
              if (nextPlayTimeRef.current <= audioCtx.currentTime) {
                nextPlayTimeRef.current = audioCtx.currentTime + AUDIO.PLAYBACK_LEAD_SECONDS;
              }

              const audioBuffer = audioCtx.createBuffer(1, float32Array.length, AUDIO.SAMPLE_RATE_OUTPUT);
              audioBuffer.getChannelData(0).set(float32Array);

              const bufferSource = audioCtx.createBufferSource();
              bufferSource.buffer = audioBuffer;
              bufferSource.connect(audioCtx.destination);
              bufferSource.start(nextPlayTimeRef.current);

              nextPlayTimeRef.current += audioBuffer.duration;
            }

            if (message.serverContent?.interrupted && outputAudioContextRef.current) {
              nextPlayTimeRef.current = outputAudioContextRef.current.currentTime ?? 0;
            }
          },

          onclose: () => {
            liveStateRef.current = 'disconnected';
            setLiveState('disconnected');
            onCloseRef.current?.();
          },

          onerror: (error: unknown) => {
            console.error('Live API Error:', error);
            liveStateRef.current = 'disconnected';
            setLiveState('disconnected');
            onErrorRef.current?.(error);
          },
        },
      });

      sessionRef.current = session;
    } catch (err) {
      console.error('Failed to connect:', err);
      setLiveState('disconnected');
      onErrorRef.current?.(err);
    }
  // systemInstruction and tools are stable config; callbacks are handled via refs.
  }, [systemInstruction, tools]);

  const disconnect = useCallback(() => {
    liveStateRef.current = 'disconnected';
    setLiveState('disconnected');

    processorRef.current?.disconnect();
    processorRef.current = null;

    audioStreamRef.current?.getTracks().forEach(track => track.stop());
    audioStreamRef.current = null;

    inputAudioContextRef.current?.close();
    inputAudioContextRef.current = null;

    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = null;

    nextPlayTimeRef.current = 0;

    if (sessionRef.current) {
      try { sessionRef.current.close?.(); } catch { /* ignore */ }
      sessionRef.current = null;
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (sessionRef.current && liveStateRef.current === 'connected') {
      sessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
    }
  }, []);

  const sendToolResponse = useCallback((functionResponses: unknown[]) => {
    if (sessionRef.current && liveStateRef.current === 'connected') {
      sessionRef.current.sendToolResponse({ functionResponses });
    }
  }, []);

  return { liveState, connect, disconnect, sendText, sendToolResponse };
}
