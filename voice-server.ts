/**
 * Standalone WebSocket voice server using Micdrop.
 * Runs alongside Next.js on port 8081.
 *
 * Usage:  npx tsx voice-server.ts
 *
 * Per-session knobs (URL query string):
 *   roomId        — scenario room id (logging only)
 *   lang          — BCP-47 language tag, e.g. hi-IN, ta-IN
 *   systemPrompt  — full system prompt assembled by the client
 *   temperature   — float, defaults to 0.7
 *   maxTokens     — int, defaults to 220
 */

import { MicdropServer } from "@micdrop/server";
import { WebSocketServer } from "ws";
import { SarvamSTT } from "./src/lib/voice/sarvam-stt";
import { SarvamTTS } from "./src/lib/voice/sarvam-tts";
import { SarvamAgent } from "./src/lib/voice/sarvam-agent";
import * as dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.VOICE_SERVER_PORT ?? "8081", 10);
const API_KEY = process.env.SARVAM_API_KEY;

if (!API_KEY) {
  console.error("SARVAM_API_KEY is not set in .env");
  process.exit(1);
}

const wss = new WebSocketServer({ port: PORT });

console.log(`[voice-server] Listening on ws://localhost:${PORT}`);

wss.on("connection", (socket, req) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const roomId = url.searchParams.get("roomId") ?? "unknown";
  const langCode = url.searchParams.get("lang");
  if (!langCode) {
    console.error(`[voice-server] Missing required 'lang' query param`);
    socket.close(4001, "Missing lang param");
    return;
  }
  const systemPrompt = url.searchParams.get("systemPrompt") ?? "";

  const tempStr = url.searchParams.get("temperature");
  const maxTokStr = url.searchParams.get("maxTokens");
  const temperature =
    tempStr !== null && !Number.isNaN(parseFloat(tempStr))
      ? Math.max(0, Math.min(1.5, parseFloat(tempStr)))
      : undefined;
  const maxTokens =
    maxTokStr !== null && !Number.isNaN(parseInt(maxTokStr, 10))
      ? Math.max(40, Math.min(512, parseInt(maxTokStr, 10)))
      : undefined;

  console.log(
    `[voice-server] New connection: room=${roomId}, lang=${langCode}, temp=${temperature ?? "default"}, maxTokens=${maxTokens ?? "default"}`
  );

  const stt = new SarvamSTT({
    apiKey: API_KEY,
    languageCode: langCode,
  });

  const tts = new SarvamTTS({
    apiKey: API_KEY,
    languageCode: langCode,
  });

  const agent = new SarvamAgent({
    apiKey: API_KEY,
    systemPrompt:
      systemPrompt ||
      `You are a helpful language learning assistant. Speak in the learner's target language.`,
    temperature,
    maxTokens,
    autoEndCall: true,
    autoIgnoreUserNoise: true,
  });

  stt.on("Transcript", (text: string) => {
    console.log(`[voice-server] [${roomId}] STT transcript: "${text}"`);
  });

  tts.on("Audio", (buf: Buffer) => {
    console.log(`[voice-server] [${roomId}] TTS audio chunk: ${buf.byteLength} bytes`);
  });

  new MicdropServer(socket as any, {
    agent,
    stt,
    tts,
  });

  socket.on("close", () => {
    console.log(`[voice-server] Connection closed: room=${roomId}`);
    stt.destroy();
    tts.destroy();
    agent.destroy();
  });
});
