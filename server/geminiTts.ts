// Gemini text-to-speech for Munchi (Dadu Food voice agent).
// Switched from Edge TTS (ur-PK-AsadNeural) 28 Nov 2026 on the user's word
// ("Voice bhi uski" — the voice should also be Gemini's). Gemini 2.5 Flash
// TTS, voice "Achird" (friendly male — Munchi is a man; no female voice
// anywhere, per the user's standing rule). Gemini returns raw 16-bit PCM
// (24 kHz mono), wrapped here in a WAV header so the client's <audio>
// element plays it. Keys come only from environment variables at runtime
// (GEMINI_API_KEY..._5, shared with server/geminiVoice.ts). If no Gemini
// key is configured, the caller falls back to Edge TTS (server/neuralTts.ts).

import { GoogleGenAI } from "@google/genai";
import { getGeminiKeys } from "./geminiVoice.js";
import { rateLimited } from "./groqVoice.js";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
// Achird — friendly male voice. (Other male options: Fenrir, Charon, Orus.)
const DEFAULT_VOICE = "Achird";
const SAMPLE_RATE = 24000;
const FETCH_TIMEOUT_MS = 30000;
const MAX_TEXT = 2000;

export function getGeminiTtsVoice(): string {
  return (process.env.GEMINI_TTS_VOICE || DEFAULT_VOICE).trim() || DEFAULT_VOICE;
}

// Wrap raw 16-bit PCM (mono) in a minimal WAV header so browsers and
// Android play it as a normal audio file.
export function pcmToWav(pcm: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function synthesizeWithGemini(apiKey: string, text: string, voice: string): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey });
  const resp = await Promise.race([
    ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini TTS timed out")), FETCH_TIMEOUT_MS),
    ),
  ]);
  const part = resp.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData && typeof p.inlineData.data === "string",
  );
  const b64 = part?.inlineData?.data;
  if (!b64) throw new Error("Gemini TTS returned no audio");
  const pcm = Buffer.from(b64, "base64");
  if (pcm.length < 100) throw new Error("Gemini TTS returned empty audio");
  return pcmToWav(pcm);
}

export interface GeminiSpeakResult {
  status: number;
  body: Buffer | { error: string };
}

export async function handleVoiceSpeakGemini(body: unknown, ip: string): Promise<GeminiSpeakResult> {
  const text = (body as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return { status: 400, body: { error: "text is required" } };
  }
  if (text.length > MAX_TEXT) {
    return { status: 400, body: { error: "text is too long" } };
  }
  if (rateLimited(ip, "voice-speak")) {
    return { status: 429, body: { error: "Too many requests — try again shortly" } };
  }
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    return { status: 503, body: { error: "Speech service unavailable" } };
  }
  const voice = getGeminiTtsVoice();
  for (const key of keys) {
    try {
      const audio = await synthesizeWithGemini(key, text.trim(), voice);
      return { status: 200, body: audio };
    } catch (err) {
      console.error("Gemini TTS error (rotating key):", err instanceof Error ? err.message.slice(0, 200) : "unknown");
      continue;
    }
  }
  return { status: 502, body: { error: "Speech service unavailable" } };
}
