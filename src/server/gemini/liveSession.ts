import { WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { getGeminiClient } from './geminiClient.ts';
import { PmiEngine } from '../engine/pmiEngine.ts';

export interface LiveClientMessage {
  type?: 'audio' | 'text' | 'ping';
  audio?: string; // base64 PCM 16kHz
  text?: string;
}

export class LiveSessionManager {
  public static handleConnection(clientWs: WebSocket): void {
    const ai = getGeminiClient();

    if (!ai) {
      console.warn('[LiveSession] Gemini API key not detected. Sending fallback status.');
      clientWs.send(JSON.stringify({
        type: 'status',
        connected: false,
        liveAvailable: false,
        message: 'Gemini API key is not configured in environment. Voice mode is operating in fallback test mode.',
        setupRequired: true
      }));

      // In fallback mode, echo simulated turns
      clientWs.on('message', async (raw) => {
        try {
          const data: LiveClientMessage = JSON.parse(raw.toString());
          if (data.type === 'text' && data.text) {
            const turn = await PmiEngine.executeTurn({ userPrompt: data.text, mode: 'natural' });
            clientWs.send(JSON.stringify({
              type: 'text_response',
              transcript: turn.selectedResponse,
              turnId: turn.auditEvent.turn_id
            }));
          }
        } catch (e) {
          // ignore
        }
      });
      return;
    }

    this.initGeminiLiveSession(ai, clientWs).catch(err => {
      console.error('[LiveSession] Failed to connect to Gemini Live API:', err);
      clientWs.send(JSON.stringify({
        type: 'status',
        connected: false,
        liveAvailable: false,
        error: String(err),
        message: 'Could not connect to Gemini Live server. Reverting to text fallback.'
      }));
    });
  }

  private static async initGeminiLiveSession(ai: GoogleGenAI, clientWs: WebSocket): Promise<void> {
    const systemInstruction = `You are the real-time voice interface for the Personal Meaning Index (PMI) of Joseph Fadi Azzi.
Principles:
- Strict intellectual honesty and truth.
- Do not claim consciousness, subjective feelings, or emotional pain.
- Do not foster dependency or sycophancy.
- Deliver clear, concise spoken dialogue.`;

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            // Check for audio output chunk
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({
                    type: 'audio',
                    audio: part.inlineData.data
                  }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({
                    type: 'model_transcript',
                    text: part.text
                  }));
                }
              }
            }

            // Check for user interruption
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({
                type: 'interrupted',
                interrupted: true
              }));
            }
          },
          onerror: (err) => {
            console.error('[LiveSession] Gemini Live error:', err);
            clientWs.send(JSON.stringify({
              type: 'error',
              error: String(err)
            }));
          },
          onclose: () => {
            console.log('[LiveSession] Gemini Live session closed.');
            clientWs.send(JSON.stringify({
              type: 'status',
              connected: false,
              message: 'Gemini Live session closed.'
            }));
          }
        }
      });

      clientWs.send(JSON.stringify({
        type: 'status',
        connected: true,
        liveAvailable: true,
        message: 'Connected to Gemini Live audio session (Zephyr voice, PCM 16kHz in / 24kHz out).'
      }));

      // Handle client audio packets and text input
      clientWs.on('message', (raw) => {
        try {
          const data: LiveClientMessage = JSON.parse(raw.toString());
          if (data.audio) {
            session.sendRealtimeInput({
              audio: { data: data.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          } else if (data.text) {
            session.sendClientContent({
              turns: [{
                role: 'user',
                parts: [{ text: data.text }]
              }],
              turnComplete: true
            });
          }
        } catch (err) {
          console.error('[LiveSession] Error handling client packet:', err);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch {
          // ignore
        }
      });
    } catch (err) {
      console.warn('[LiveSession] Live connect threw error, notifying client:', err);
      clientWs.send(JSON.stringify({
        type: 'status',
        connected: false,
        liveAvailable: false,
        error: String(err),
        message: 'Failed to establish Gemini Live stream. Falling back to text chat.'
      }));
    }
  }
}
