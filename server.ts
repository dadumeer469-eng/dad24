import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { handleVoiceChat, handleVoiceTranscribe, readRawBody } from "./server/groqVoice";
import { handleVoiceSpeak } from "./server/neuralTts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Groq voice agent — chat + Whisper transcription (local dev mirror of
  // api/voice-chat.ts and api/voice-transcribe.ts). Same shared logic.
  app.post("/api/voice-chat", async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const result = await handleVoiceChat(req.body || {}, ip);
    res.status(result.status).json(result.body);
  });

  app.post("/api/voice-transcribe", async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const raw = await readRawBody(req as unknown as AsyncIterable<Buffer>);
    const result = await handleVoiceTranscribe(req.headers["content-type"], raw, ip);
    res.status(result.status).json(result.body);
  });

  // Neural Urdu TTS (local dev mirror of api/voice-speak.ts). Same shared logic.
  app.post("/api/voice-speak", async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const result = await handleVoiceSpeak(req.body || {}, ip);
    if (result.status === 200 && Buffer.isBuffer(result.body)) {
      res.setHeader("Content-Type", "audio/mpeg");
      return res.status(200).send(result.body);
    }
    res.status(result.status).json(result.body);
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Expose public browser Google Maps API key from runtime environment
  app.get("/api/maps-config", (_req, res) => {
    const apiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      "";
    res.json({ apiKey });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
