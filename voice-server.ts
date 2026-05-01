/**
 * Standalone WebSocket voice server using Micdrop.
 * Runs alongside Next.js on port 8081.
 *
 * STT + TTS always use Sarvam. LLM uses Groq (Llama) for scenario rooms
 * when GROQ_API_KEY is set, otherwise falls back to Sarvam.
 */

import { MicdropServer } from "@micdrop/server";
import { WebSocketServer } from "ws";
import { SarvamSTT } from "./src/lib/voice/sarvam-stt";
import { SarvamTTS } from "./src/lib/voice/sarvam-tts";
import { SarvamAgent, type LlmConfig } from "./src/lib/voice/sarvam-agent";
import * as dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.VOICE_SERVER_PORT ?? process.env.PORT ?? "8081", 10);
const SARVAM_KEY = process.env.SARVAM_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

if (!SARVAM_KEY) {
  console.error("SARVAM_API_KEY is not set in .env");
  process.exit(1);
}

const GROQ_LLM: LlmConfig | undefined = GROQ_KEY
  ? { apiBase: "https://api.groq.com/openai", apiKey: GROQ_KEY, model: "llama-3.3-70b-versatile", authStyle: "bearer" }
  : undefined;

if (GROQ_LLM) console.log("[voice-server] Groq LLM enabled (llama-3.3-70b-versatile)");
else console.log("[voice-server] Groq not configured, using Sarvam LLM");

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
  const firstTurnMinQuoteStr = url.searchParams.get("firstTurnMinQuote");
  const targetMaxStr = url.searchParams.get("targetMax");
  const llmStreamRaw = url.searchParams.get("llmStream");
  const llmStream =
    llmStreamRaw === null || llmStreamRaw === ""
      ? true
      : llmStreamRaw !== "0" && llmStreamRaw.toLowerCase() !== "false";
  const temperature =
    tempStr !== null && !Number.isNaN(parseFloat(tempStr))
      ? Math.max(0, Math.min(1.5, parseFloat(tempStr)))
      : undefined;
  const firstTurnMinQuote =
    firstTurnMinQuoteStr !== null && !Number.isNaN(parseInt(firstTurnMinQuoteStr, 10))
      ? Math.max(1, parseInt(firstTurnMinQuoteStr, 10))
      : undefined;
  const targetMax =
    targetMaxStr !== null && !Number.isNaN(parseInt(targetMaxStr, 10))
      ? Math.max(1, parseInt(targetMaxStr, 10))
      : undefined;

  const llmConfig = GROQ_LLM ?? undefined;

  console.log(
    `[voice-server] New connection: room=${roomId}, lang=${langCode}, llm=${llmConfig ? "groq" : "sarvam"}, temp=${temperature ?? "default"}, llmStream=${llmStream}`
  );

  const stt = new SarvamSTT({
    apiKey: SARVAM_KEY,
    languageCode: langCode,
  });

  const tts = new SarvamTTS({
    apiKey: SARVAM_KEY,
    languageCode: langCode,
  });

  const agent = new SarvamAgent({
    apiKey: SARVAM_KEY,
    systemPrompt:
      systemPrompt ||
      `You are a helpful language learning assistant. Speak in the learner's target language.`,
    temperature,
    firstTurnMinQuote,
    targetMax,
    autoEndCall: true,
    autoIgnoreUserNoise: true,
    llmStream,
    llm: llmConfig,
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
