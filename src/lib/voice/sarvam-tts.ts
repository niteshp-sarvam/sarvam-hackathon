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

const DEFAULT_MODEL = "bulbul:v2";
const DEFAULT_SPEAKER = "anushka";
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

    textStream.on("data", async (chunk: Buffer) => {
      if (this.canceled) return;
      const text = chunk.toString("utf-8");
      if (!text.trim()) return;
      await this.initPromise;
      this.sendText(text);
    });

    textStream.on("end", async () => {
      if (this.canceled) return;
      await this.initPromise;
      // Flush remaining buffered text
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "flush" }));
        this.log("Flushed text buffer");
      }
    });

    textStream.on("error", () => {
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
      const socket = new WebSocket(url, {
        headers: { "api-subscription-key": this.options.apiKey },
      });
      this.socket = socket;

      const timeout = setTimeout(() => {
        this.log("Connection timeout");
        socket.removeAllListeners();
        socket.close();
        this.socket = undefined;
        reject(new Error("WebSocket connection timeout"));
      }, this.options.connectionTimeout ?? DEFAULT_CONNECTION_TIMEOUT);

      socket.addEventListener("open", () => {
        clearTimeout(timeout);
        this.log("TTS connection opened");

        // Send config message first
        this.socket?.send(
          JSON.stringify({
            type: "config",
            data: {
              speaker: this.options.speaker ?? DEFAULT_SPEAKER,
              target_language_code: this.options.languageCode,
              output_audio_codec: "pcm",
              min_buffer_size: 30,
            },
          })
        );

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
        this.log("WebSocket error:", error);
        reject(new Error("WebSocket connection error"));
      });

      socket.addEventListener("close", ({ code, reason }) => {
        clearTimeout(timeout);
        this.log("TTS connection closed", { code, reason });
        if (this.keepAliveInterval) {
          clearInterval(this.keepAliveInterval);
          this.keepAliveInterval = undefined;
        }
      });

      socket.addEventListener("message", (event) => {
        if (this.canceled) return;
        try {
          const message = JSON.parse(event.data.toString());

          if (message.type === "audio" && message.data?.audio) {
            const audioBuffer = Buffer.from(message.data.audio, "base64");
            this.emit("Audio", audioBuffer);
            this.log(`Received audio chunk (${audioBuffer.byteLength} bytes)`);
          }

          if (message.type === "event" && message.data?.event_type === "final") {
            this.log("TTS stream complete");
            this.isProcessing = false;
          }
        } catch {
          // non-JSON message, ignore
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
