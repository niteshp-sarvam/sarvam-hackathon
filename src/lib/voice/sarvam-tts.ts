import { TTS } from "@micdrop/server";
import { Readable } from "stream";
import WebSocket from "ws";

export interface SarvamTTSOptions {
  apiKey: string;
  languageCode: string;
  speaker?: string;
  model?: string;
  connectionTimeout?: number;
}

const DEFAULT_MODEL = "bulbul:v3";
const DEFAULT_SPEAKER = "shubh";
const DEFAULT_CONNECTION_TIMEOUT = 5000;

/**
 * Sarvam AI streaming TTS via WebSocket.
 * Opens wss://api.sarvam.ai/text-to-speech/ws, streams text in,
 * emits Audio (Buffer) events as chunks arrive.
 */
export class SarvamTTS extends TTS {
  private socket?: WebSocket;
  private initPromise: Promise<void>;
  private keepAliveInterval?: ReturnType<typeof setInterval>;
  private isProcessing = false;
  private canceled = false;

  constructor(private options: SarvamTTSOptions) {
    super();
    this.initPromise = this.initWS().catch((err) => {
      console.error("[SarvamTTS] Connection error:", err);
    });
  }

  speak(textStream: Readable) {
    this.canceled = false;
    this.isProcessing = true;
    let textBuffer = "";

    textStream.on("data", async (chunk: Buffer) => {
      if (this.canceled) return;
      const text = chunk.toString("utf-8");
      textBuffer += text;

      // Send at sentence boundaries to avoid tiny fragments the API rejects
      const sentenceEnd = /[।.!?\n]$/;
      if (sentenceEnd.test(textBuffer.trim()) && textBuffer.trim().length >= 10) {
        const toSend = textBuffer.trim();
        textBuffer = "";
        console.log(`[SarvamTTS] Sending sentence: "${toSend.slice(0, 80)}"`);
        await this.initPromise;
        this.sendText(toSend);
      }
    });

    textStream.on("end", async () => {
      if (this.canceled) return;
      await this.initPromise;
      // Send any remaining buffered text
      if (textBuffer.trim()) {
        console.log(`[SarvamTTS] Sending remaining: "${textBuffer.trim().slice(0, 80)}"`);
        this.sendText(textBuffer.trim());
        textBuffer = "";
      }
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "flush" }));
        console.log("[SarvamTTS] Sent flush");
      }
    });

    textStream.on("error", (err) => {
      console.error("[SarvamTTS] Stream error:", err);
      this.isProcessing = false;
    });
  }

  cancel() {
    if (!this.isProcessing) return;
    this.log("Cancel");
    this.canceled = true;
    this.isProcessing = false;
  }

  destroy() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }
    this.socket?.removeAllListeners();
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close(1000);
    }
    this.socket = undefined;
    this.isProcessing = false;
    super.destroy();
  }

  private initWS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        model: this.options.model ?? DEFAULT_MODEL,
        send_completion_event: "true",
      });

      const url = `wss://api.sarvam.ai/text-to-speech/ws?${params.toString()}`;
      console.log(`[SarvamTTS] Connecting to ${url.slice(0, 80)}...`);
      const socket = new WebSocket(url, {
        headers: { "api-subscription-key": this.options.apiKey },
      });
      this.socket = socket;

      const timeout = setTimeout(() => {
        console.log("[SarvamTTS] Connection timeout");
        socket.removeAllListeners();
        socket.close();
        this.socket = undefined;
        reject(new Error("WebSocket connection timeout"));
      }, this.options.connectionTimeout ?? DEFAULT_CONNECTION_TIMEOUT);

      socket.addEventListener("open", () => {
        clearTimeout(timeout);
        console.log("[SarvamTTS] Connection opened");

        const configMsg = {
          type: "config",
          data: {
            speaker: this.options.speaker ?? DEFAULT_SPEAKER,
            target_language_code: this.options.languageCode,
            output_audio_codec: "linear16",
            speech_sample_rate: "16000",
          },
        };
        console.log("[SarvamTTS] Sending config:", JSON.stringify(configMsg));
        this.socket?.send(JSON.stringify(configMsg));

        // Keep-alive every 50s (timeout is 60s)
        this.keepAliveInterval = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 50_000);

        resolve();
      });

      socket.addEventListener("error", (error) => {
        clearTimeout(timeout);
        console.error("[SarvamTTS] WebSocket error:", error);
        reject(new Error("WebSocket connection error"));
      });

      socket.addEventListener("close", ({ code, reason }) => {
        clearTimeout(timeout);
        console.log(`[SarvamTTS] Connection closed: code=${code} reason=${reason}`);
        if (this.keepAliveInterval) {
          clearInterval(this.keepAliveInterval);
          this.keepAliveInterval = undefined;
        }
      });

      socket.addEventListener("message", (event) => {
        if (this.canceled) return;
        const raw = event.data.toString();
        try {
          const message = JSON.parse(raw);

          if (message.type === "audio" && message.data?.audio) {
            const audioBuffer = Buffer.from(message.data.audio, "base64");
            console.log(`[SarvamTTS] Audio chunk: ${audioBuffer.byteLength} bytes`);
            this.emit("Audio", audioBuffer);
          } else {
            console.log(`[SarvamTTS] Message: ${raw.slice(0, 200)}`);
          }

          if (message.type === "event" && message.data?.event_type === "final") {
            console.log("[SarvamTTS] Stream complete");
            this.isProcessing = false;
          }
        } catch {
          console.log("[SarvamTTS] Non-JSON:", raw.slice(0, 100));
        }
      });
    });
  }

  private sendText(text: string) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        type: "text",
        data: { text },
      })
    );
    this.log(`Sent text: "${text.slice(0, 60)}..."`);
  }
}
