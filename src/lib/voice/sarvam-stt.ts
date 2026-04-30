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
 *
 * Two important findings (verified with `npm run test:sarvam`):
 *   1. Sarvam's STT WS is one-shot: after it returns a transcript for one
 *      utterance, the same socket stops processing further audio.  → so we
 *      need a fresh socket per utterance.
 *   2. Sarvam's VAD doesn't tolerate getting a "burst then real-time" stream.
 *      If the socket is still CONNECTING when the user starts speaking, the
 *      chunks queue up and get flushed in microseconds when it opens; Sarvam
 *      never emits START_SPEECH and the request silently times out. So the
 *      socket must already be OPEN before the first audio chunk arrives.
 *
 * To satisfy both, we **pre-warm** one connection at all times:
 *   - The constructor opens socket #1 in the background.
 *   - When `transcribe()` is called, it adopts the pre-warmed socket
 *     (which is normally already OPEN by the time the user speaks) and
 *     immediately starts pre-warming socket #2 for the next turn.
 *   - On `destroy()`, both the active turn socket and the pre-warmed one
 *     are closed.
 */
export class SarvamSTT extends STT {
  private warmSocket?: WarmSocket;
  private activeTurn?: { close: () => void };
  private isDestroyed = false;
  private turnCounter = 0;

  constructor(private options: SarvamSTTOptions) {
    super();
    this.startWarming();
  }

  transcribe(audioStream: Readable) {
    if (this.isDestroyed) return;
    const turnId = ++this.turnCounter;
    const tag = `[SarvamSTT][t${turnId}]`;

    // Adopt the pre-warmed socket and immediately spin up the next one.
    const warm =
      this.warmSocket ??
      this.createWarmSocket(`${tag}(cold)`); // unlikely fallback
    this.warmSocket = undefined;
    this.startWarming();

    let resolved = false;
    let hasAudioData = false;
    let endedBeforeOpen = false;
    let chunkCount = 0;
    const queue: Buffer[] = [];
    let transcriptionTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (transcriptionTimer) {
        clearTimeout(transcriptionTimer);
        transcriptionTimer = undefined;
      }
      warm.close();
    };

    const emitOnce = (text: string) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      // Empty/timeout noise turns should not be forwarded as user utterances,
      // otherwise they can interrupt an in-flight assistant response.
      if (!text.trim()) {
        console.log(`${tag} Transcript dropped (empty/noise turn)`);
        return;
      }
      this.emit("Transcript", text);
    };

    const sendChunk = (chunk: Buffer) => {
      const sock = warm.socket;
      if (sock.readyState !== WebSocket.OPEN) return;
      sock.send(
        JSON.stringify({
          audio: {
            data: chunk.toString("base64"),
            sample_rate: String(SAMPLE_RATE),
            encoding: "audio/wav",
          },
        })
      );
    };

    const sendFlush = () => {
      const sock = warm.socket;
      if (sock.readyState !== WebSocket.OPEN) return;
      sock.send(JSON.stringify({ type: "flush" }));
      console.log(`${tag} Sent flush signal`);
      transcriptionTimer = setTimeout(() => {
        console.log(`${tag} Transcription timeout — emitting empty`);
        emitOnce("");
      }, this.options.transcriptionTimeout ?? DEFAULT_TRANSCRIPTION_TIMEOUT);
    };

    const drainQueue = () => {
      for (const c of queue) sendChunk(c);
      queue.length = 0;
    };

    // Wire socket events for THIS turn.
    warm.bind({
      onOpen: () => {
        console.log(`${tag} Connection opened (warm=${warm.openedAtAdopt ? "yes" : "lazy"})`);
        drainQueue();
        if (endedBeforeOpen && hasAudioData) sendFlush();
        else if (endedBeforeOpen && !hasAudioData) emitOnce("");
      },
      onMessage: (raw) => {
        try {
          const message = JSON.parse(raw);
          if (message.type === "events") {
            console.log(`${tag} Event: ${message.data?.signal_type}`);
            return;
          }
          if (message.type === "error") {
            console.error(
              `${tag} API error: ${message.data?.message ?? message.data?.error ?? raw.slice(0, 200)}`
            );
            emitOnce("");
            return;
          }
          if (message.type === "data") {
            const transcript: string = message.data?.transcript ?? "";
            console.log(`${tag} Transcript: "${transcript}"`);
            // Sarvam closes the recognition session after a `data` reply,
            // so we must resolve here even if the transcript is empty —
            // otherwise we'd just wait for the 8s timeout while Sarvam
            // ignores any further audio on this socket.
            emitOnce(transcript);
            return;
          }
          console.log(`${tag} Unknown message type: ${message.type}`);
        } catch {
          console.log(`${tag} Non-JSON message: ${raw.slice(0, 100)}`);
        }
      },
      onError: (msg) => {
        console.error(`${tag} WebSocket error: ${msg}`);
        emitOnce("");
      },
      onClose: (code, reason) => {
        console.log(`${tag} Connection closed: code=${code} reason="${reason}"`);
        if (!resolved) emitOnce("");
      },
    });

    this.activeTurn = { close: cleanup };

    // Adopting a pre-warmed socket: it might already be OPEN, in which case we
    // also need to fire the open path now, since `bind()` only registers
    // listeners for FUTURE events.
    if (warm.socket.readyState === WebSocket.OPEN) {
      warm.openedAtAdopt = true;
      console.log(`${tag} Adopted warm socket (already OPEN)`);
    } else {
      console.log(`${tag} Adopted warm socket (state=${warm.socket.readyState})`);
    }

    audioStream.on("data", (chunk: Buffer) => {
      if (resolved) return;
      hasAudioData = true;
      chunkCount++;
      if (chunkCount <= 3 || chunkCount % 20 === 0) {
        console.log(
          `${tag} Audio chunk #${chunkCount} (${chunk.byteLength} B), state=${warm.socket.readyState}`
        );
      }
      if (warm.socket.readyState === WebSocket.OPEN) sendChunk(chunk);
      else queue.push(chunk);
    });

    audioStream.on("end", () => {
      console.log(`${tag} Audio stream ended. Total chunks: ${chunkCount}`);
      if (resolved) return;
      if (!hasAudioData) {
        emitOnce("");
        return;
      }
      if (warm.socket.readyState === WebSocket.OPEN) sendFlush();
      else endedBeforeOpen = true;
    });

    audioStream.on("error", (err) => {
      console.error(`${tag} audio stream error:`, err);
      if (!resolved) emitOnce("");
    });
  }

  destroy() {
    super.destroy();
    this.isDestroyed = true;
    if (this.activeTurn) this.activeTurn.close();
    if (this.warmSocket) this.warmSocket.close();
    this.activeTurn = undefined;
    this.warmSocket = undefined;
  }

  // ───────── pre-warming helpers ──────────────────────────────────────────

  private startWarming() {
    if (this.isDestroyed) return;
    if (this.warmSocket) return;
    this.warmSocket = this.createWarmSocket("[SarvamSTT][warm]");
  }

  private createWarmSocket(tag: string): WarmSocket {
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
    console.log(`${tag} Connecting fresh WS...`);
    const socket = new WebSocket(url, {
      headers: { "api-subscription-key": this.options.apiKey },
    });

    const warm = new WarmSocket(socket, this.options.connectionTimeout ?? DEFAULT_CONNECTION_TIMEOUT);
    socket.addEventListener("open", () => {
      // Only log the open if this socket is still in the unadopted warm pool
      // (adopted sockets log their own "Connection opened" with the turn tag).
      if (!warm.adopted) console.log(`${tag} socket OPEN`);
    });
    socket.addEventListener("error", (e) => {
      if (!warm.adopted) {
        console.error(`${tag} error: ${(e as { message?: string }).message ?? "?"}`);
      }
    });
    socket.addEventListener("close", ({ code }) => {
      // If still unadopted (i.e. closed in the pool), replace it.
      if (!warm.adopted) {
        console.log(`${tag} closed code=${code} (unadopted)`);
        if (this.warmSocket === warm && !this.isDestroyed) {
          this.warmSocket = undefined;
          this.startWarming();
        }
      }
      // If adopted, the bound turn handler logs "Connection closed".
    });
    return warm;
  }
}

// ───────── helpers ────────────────────────────────────────────────────────

interface TurnHandlers {
  onOpen: () => void;
  onMessage: (raw: string) => void;
  onError: (msg: string) => void;
  onClose: (code: number, reason: string) => void;
}

class WarmSocket {
  socket: WebSocket;
  openedAtAdopt = false;
  adopted = false;
  private bound = false;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private closed = false;

  constructor(socket: WebSocket, connectionTimeout: number) {
    this.socket = socket;
    this.connectTimer = setTimeout(() => {
      this.connectTimer = undefined;
      if (
        this.socket.readyState === WebSocket.CONNECTING ||
        this.socket.readyState === WebSocket.CLOSED
      ) {
        try {
          this.socket.close();
        } catch {
          // ignore
        }
      }
    }, connectionTimeout);
  }

  /** Wires per-turn handlers. Must be called before audio is streamed. */
  bind(h: TurnHandlers) {
    if (this.bound) return;
    this.bound = true;
    this.adopted = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }

    if (this.socket.readyState === WebSocket.OPEN) {
      // Fire open synchronously next tick so the caller's queue/flush
      // logic gets a chance to install before draining.
      setImmediate(() => h.onOpen());
    }
    this.socket.addEventListener("open", () => h.onOpen());
    this.socket.addEventListener("message", (e) => h.onMessage(e.data.toString()));
    this.socket.addEventListener("error", (e) =>
      h.onError((e as { message?: string }).message ?? "unknown")
    );
    this.socket.addEventListener("close", ({ code, reason }) => {
      const r = typeof reason === "string" ? reason : String(reason ?? "");
      h.onClose(code, r);
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
    if (
      this.socket.readyState === WebSocket.OPEN ||
      this.socket.readyState === WebSocket.CONNECTING
    ) {
      try {
        this.socket.close(1000);
      } catch {
        // ignore
      }
    }
  }
}
