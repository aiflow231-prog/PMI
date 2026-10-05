import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Radio,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting to Gemini Live...');
  const [setupRequired, setSetupRequired] = useState(false);
  const [transcript, setTranscript] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([]);
  const [interrupted, setInterrupted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      connectWebSocket();
    } else {
      cleanupAudio();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }

    return () => {
      cleanupAudio();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;
    setStatusMessage('Initiating WebSocket connection to /live...');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setStatusMessage('WebSocket connected. Initializing voice session...');
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status') {
          setStatusMessage(msg.message || 'Ready');
          setSetupRequired(Boolean(msg.setupRequired));
        } else if (msg.type === 'interrupted') {
          setInterrupted(true);
          // Halt audio playback immediately
          nextPlayTimeRef.current = 0;
          setTimeout(() => setInterrupted(false), 1500);
        } else if (msg.type === 'audio' && msg.audio) {
          playAudioChunk(msg.audio);
        } else if (msg.type === 'model_transcript' && msg.text) {
          setTranscript(prev => [...prev, { sender: 'assistant', text: msg.text }]);
        } else if (msg.type === 'text_response' && msg.transcript) {
          setTranscript(prev => [...prev, { sender: 'assistant', text: msg.transcript }]);
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error:', err);
      setStatusMessage('Connection error. Operating in offline diagnostic mode.');
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatusMessage('Voice session closed.');
    };
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      mediaStreamRef.current = stream;

      // 16kHz AudioContext for Gemini Live input
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      // 24kHz AudioContext for Gemini Live output
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;
      nextPlayTimeRef.current = outputCtx.currentTime;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(inputData);
        const base64 = bufferToBase64(pcm16);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ audio: base64 }));
        }
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);
      setIsRecording(true);
      setStatusMessage('Microphone streaming 16kHz PCM to Gemini Live (Zephyr Voice)...');
    } catch (err: any) {
      console.error('Microphone error:', err);
      setStatusMessage(`Microphone access error: ${err.message}`);
    }
  };

  const stopMicrophone = () => {
    cleanupAudio();
    setIsRecording(false);
    setStatusMessage('Microphone paused.');
  };

  const cleanupAudio = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
  };

  const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const bufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const playAudioChunk = (base64Audio: string) => {
    try {
      if (!outputAudioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        outputAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
        nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
      }

      const ctx = outputAudioCtxRef.current;
      const binary = window.atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Radio className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Gemini Live Voice Session</h2>
              <p className="text-xs text-slate-400">
                Low-latency, real-time voice streaming with interruption handling (Zephyr Voice, 16kHz in / 24kHz out).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Central Audio Visualizer */}
        <div className="p-8 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            {/* Outer pulsating rings */}
            <div className={`absolute -inset-4 rounded-full bg-cyan-500/20 blur-xl transition-all ${
              isRecording ? 'opacity-100 animate-pulse' : 'opacity-0'
            }`} />

            <button
              onClick={isRecording ? stopMicrophone : startMicrophone}
              className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all shadow-xl ${
                isRecording
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-red-950/50 scale-105'
                  : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white hover:scale-105 shadow-cyan-950/50'
              }`}
            >
              {isRecording ? <Mic className="h-10 w-10 animate-bounce" /> : <MicOff className="h-10 w-10" />}
            </button>
          </div>

          <div className="text-center space-y-1">
            <div className="text-sm font-semibold text-white">
              {isRecording ? 'Listening & Streaming Audio' : 'Microphone Inactive'}
            </div>
            <p className="text-xs text-slate-400 max-w-sm">
              {statusMessage}
            </p>
          </div>

          {/* Interruption alert */}
          {interrupted && (
            <div className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono animate-fade-in flex items-center gap-1.5">
              <span>⚡ Interrupted — Voice output halted instantly</span>
            </div>
          )}

          {/* Setup / Credential Notice if fallback */}
          {setupRequired && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 max-w-md text-left space-y-1">
              <div className="font-semibold text-cyan-300 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Live API Status:
              </div>
              <p>
                Live audio session connects through server-side secret injection (<code className="text-cyan-400">GEMINI_API_KEY</code>). If unconfigured in local preview, the fallback mode enables full text-and-voice interaction.
              </p>
            </div>
          )}
        </div>

        {/* Live Transcript Stream */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 max-h-48 overflow-y-auto space-y-2 text-xs">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Live Transcript</div>
          {transcript.length === 0 ? (
            <div className="text-slate-600 italic">No spoken turns recorded yet. Speak into the microphone...</div>
          ) : (
            transcript.map((t, idx) => (
              <div key={idx} className={`p-2 rounded-lg ${t.sender === 'user' ? 'bg-slate-900 text-cyan-300' : 'bg-slate-900/50 text-slate-200'}`}>
                <span className="font-bold text-[10px] uppercase font-mono mr-2 text-slate-400">{t.sender}:</span>
                {t.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
