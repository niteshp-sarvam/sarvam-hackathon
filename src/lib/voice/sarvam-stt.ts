import { STT } from "@micdrop/server";
import { Readable } from "stream";
import WebSocket from "ws";

export interface SarvamSTTOptions {
  apiKey: string;
  languageCode: string;
  model?: string;
  connectionTimeout?: number;
  transcriptionTimeout?: number;
}

const DEFAULT_MODEL = "saaras:v3";
const DEFAULT_CONNECTION_TIMEOUT = 5000;
const DEFAULT_TRANSCRIPTION_TIMEOUT = 8000;
const SAMPLE_RATE = 16000;

/**
 * Sarvam AI real-time STT via WebSocket.
 * Streams PCM audio to wss://api.sarvam.ai/speech-to-text/ws
 * and emits final transcript strings.
 */
export class SarvamSTT extends STT {
  private socket?: WebSocket;
  private initPromise: Promise<void>;
  private transcriptionTimeout?: ReturnType<typeof setTimeout>;
  private hasAudioData = false;

  constructor(private options: SarvamSTTOptions) {
    super();
    this.initPromise = this.initWS().catch((err) => {
      console.error("[SarvamSTT] Connection error:", err);
    });
  }

  transcribe(audioStream: Readable) {
    this.hasAudioData = false;
    let chunkCount = 0;

    audioStream.on("data", async (chunk: Buffer) => {
      this.hasAudioData = true;
      chunkCount++;
      if (chunkCount <= 3 || chunkCount % 20 === 0) {
        console.log(`[SarvamSTT] Audio chunk #${chunkCount} (${chunk.byteLength} bytes), socket=${this.socket?.readyState}`);
      }
      await this.initPromise;
      if (this.socket?.readyState === WebSocket.OPEN) {
        const b64 = chunk.toString("base64");
        this.socket.send(
          JSON.stringify({
            audio: {
              data: b64,
              sample_rate: String(SAMPLE_RATE),
              encoding: "audio/wav",
            },
          })
        );
      }
    });

    audioStream.on("end", async () => {
      console.log(`[SarvamSTT] Audio stream ended. Total chunks: ${chunkCount}`);
      await this.initPromise;
      if (!this.hasAudioData) return;

      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "flush" }));
        console.log("[SarvamSTT] Sent flush signal");
      }

      this.transcriptionTimeout = setTimeout(() => {
        this.transcriptionTimeout = undefined;
        console.log("[SarvamSTT] Transcription timeout — emitting empty");
        this.emit("Transcript", "");
      }, this.options.transcriptionTimeout ?? DEFAULT_TRANSCRIPTION_TIMEOUT);
    });
  }

  destroy() {
    super.destroy();
    if (this.transcriptionTimeout) {
      clearTimeout(this.transcriptionTimeout);
      this.transcriptionTimeout = undefined;
    }
    this.socket?.removeAllListeners();
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close(1000);
    }
    this.socket = undefined;
  }

  private initWS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        model: this.options.model ?? DEFAULT_MODEL,
        "language-code": this.options.languageCode,
        mode: "transcribe",
        sample_rate: SAMPLE_RATE.toString(),
        input_audio_codec: "pcm_s16le",
        high_vad_sensitivity: "true",
        flush_signal: "true",
        vad_signals: "true",
      });

      const url = `wss://api.sarvam.ai/speech-to-text/ws?${params.toString()}`;
      console.log(`[SarvamSTT] Connecting to ${url.slice(0, 120)}...`);
      const socket = new WebSocket(url, {
        headers: { "api-subscription-key": this.options.apiKey },
      });
      this.socket = socket;

      const timeout = setTimeout(() => {
        console.log("[SarvamSTT] Connection timeout");
        socket.removeAllListeners();
        socket.close();
        this.socket = undefined;
        reject(new Error("WebSocket connection timeout"));
      }, this.options.connectionTimeout ?? DEFAULT_CONNECTION_TIMEOUT);

      socket.addEventListener("open", () => {
        clearTimeout(timeout);
        console.log("[SarvamSTT] Connection opened");
        resolve();
      });

      socket.addEventListener("error", (error) => {
        clearTimeout(timeout);
        console.error("[SarvamSTT] WebSocket error:", error);
        reject(new Error("WebSocket connection error"));
      });

      socket.addEventListener("close", ({ code, reason }) => {
        clearTimeout(timeout);
        console.log(`[SarvamSTT] Connection closed: code=${code} reason=${reason}`);
      });

      socket.addEventListener("message", (event) => {
        const raw = event.data.toString();
        console.log("[SarvamSTT] Raw message:", raw.slice(0, 300));
        try {
          const message = JSON.parse(raw);

          if (message.type === "speech_start") {
            console.log("[SarvamSTT] Speech detected");
            return;
          }
          if (message.type === "speech_end") {
            console.log("[SarvamSTT] Speech ended");
            return;
          }

          const transcript =
            message.text ??
            message.transcript ??
            message.data?.transcript ??
            message.data?.text ??
            "";

          const isFinal =
            message.type === "transcript" ||
            message.type === "final" ||
            message.is_final;

          console.log(`[SarvamSTT] Parsed: type=${message.type} isFinal=${isFinal} transcript="${transcript}"`);

          if (isFinal && transcript) {
            console.log(`[SarvamSTT] Emitting transcript: "${transcript}"`);
            this.emit("Transcript", transcript);

            if (this.transcriptionTimeout) {
              clearTimeout(this.transcriptionTimeout);
              this.transcriptionTimeout = undefined;
            }
          }
        } catch {
          console.log("[SarvamSTT] Non-JSON message:", raw.slice(0, 100));
        }
      });
    });
  }
}
