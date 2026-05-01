import { Agent, AgentOptions } from "@micdrop/server";
import { PassThrough } from "stream";

export interface LlmConfig {
  apiBase: string;
  apiKey: string;
  model: string;
  authStyle: "bearer" | "sarvam";
}

export interface SarvamAgentOptions extends AgentOptions {
  apiKey: string;
  temperature?: number;
  firstTurnMinQuote?: number;
  targetMax?: number;
  llmStream?: boolean;
  llm?: LlmConfig;
}

const SARVAM_LLM: LlmConfig = {
  apiBase: "https://api.sarvam.ai",
  apiKey: "",
  model: "sarvam-105b",
  authStyle: "sarvam",
};

/**
 * Voice agent for Micdrop. LLM backend is configurable via `llm` option
 * (defaults to Sarvam; pass Groq config for fast Llama inference).
 *
 * System prompt enforces `<speak>...</speak>` — only content inside those
 * tags reaches TTS. Everything else is structurally invisible.
 */
export class SarvamAgent extends Agent<SarvamAgentOptions> {
  private abortController?: AbortController;
  private llm: LlmConfig;

  constructor(options: SarvamAgentOptions) {
    super(options);
    this.llm = options.llm ?? { ...SARVAM_LLM, apiKey: options.apiKey };
  }

  private buildHeaders(): Record<string, string> {
    return this.llm.authStyle === "bearer"
      ? { "Content-Type": "application/json", Authorization: `Bearer ${this.llm.apiKey}` }
      : { "Content-Type": "application/json", "api-subscription-key": this.llm.apiKey };
  }

  private buildBody(messages: { role: string; content: string }[], stream: boolean) {
    const body: Record<string, unknown> = {
      model: this.llm.model,
      messages,
      temperature: this.options.temperature ?? 0.7,
      stream,
    };
    if (this.llm.authStyle === "sarvam") {
      body.reasoning_effort = null;
    }
    return body;
  }

  private async fetchNonStreamCompletion(
    messages: { role: string; content: string }[],
    signal: AbortSignal
  ): Promise<string> {
    const res = await fetch(`${this.llm.apiBase}/v1/chat/completions`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(messages, false)),
      signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn("[SarvamAgent] Non-stream request failed:", res.status, errBody.slice(0, 240));
      return "";
    }
    const json = (await res.json()) as {
      choices?: Array<{ finish_reason?: string; message?: { content?: string | null } }>;
    };
    return (json.choices?.[0]?.message?.content ?? "").trim();
  }

  protected async generateAnswer(stream: PassThrough): Promise<void> {
    console.log("[SarvamAgent] generateAnswer called, conversation length:", this.conversation.length);
    const prev = this.abortController;
    this.abortController = new AbortController();
    const abortController = this.abortController;
    prev?.abort();

    try {
      const raw = this.conversation.map((m) => {
        if (m.role === "tool_call" || m.role === "tool_result") {
          return { role: "assistant" as const, content: JSON.stringify(m) };
        }
        return { role: m.role, content: m.content };
      });
      const isFirstAssistantTurn = !raw.some((m) => m.role === "assistant");
      const shouldGuardFirstPrice =
        isFirstAssistantTurn &&
        typeof this.options.firstTurnMinQuote === "number" &&
        typeof this.options.targetMax === "number";

      const messages: { role: string; content: string }[] = [];
      if (this.options.systemPrompt) {
        messages.push({ role: "system", content: this.options.systemPrompt });
      }
      for (const m of raw) {
        if (m.role === "system") continue;
        const last = messages[messages.length - 1];
        if (last && last.role === m.role) {
          last.content += " " + m.content;
        } else {
          messages.push(m);
        }
      }

      console.log("[SarvamAgent] Sending messages:", JSON.stringify(messages.map(m => ({ role: m.role, content: m.content.slice(0, 60) }))));

      const useLlmStream = this.options.llmStream !== false;

      if (!useLlmStream) {
        const fullMessage = await this.fetchNonStreamCompletion(messages, abortController.signal);

        let spoken = extractSpeak(fullMessage);
        if (
          shouldGuardFirstPrice &&
          typeof this.options.firstTurnMinQuote === "number" &&
          typeof this.options.targetMax === "number"
        ) {
          spoken = enforceFirstQuoteAboveTarget(spoken, this.options.firstTurnMinQuote, this.options.targetMax);
        }
        if (spoken) stream.write(spoken);
        console.log(`[SarvamAgent] Response (non-stream): "${spoken.slice(0, 150)}"`);
        if (fullMessage) {
          const { message, metadata } = this.extract(fullMessage);
          this.addAssistantMessage(message, metadata);
        }
        stream.end();
        this.abortController = undefined;
        return;
      }

      const res = await fetch(`${this.llm.apiBase}/v1/chat/completions`, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildBody(messages, true)),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Sarvam Chat API error: ${res.status} ${errBody}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullMessage = "";
      let sseBuffer = "";
      let streamedAudio = false;

      // State machine for <speak> tag parsing across chunk boundaries
      const tagParser = new SpeakTagStreamParser();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (abortController !== this.abortController) return;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullMessage += delta;

              if (!shouldGuardFirstPrice) {
                const audible = tagParser.feed(delta);
                if (audible) {
                  stream.write(audible);
                  streamedAudio = true;
                }
              }
            }
          } catch {
            // malformed SSE chunk
          }
        }
      }

      // Non-streaming fallback if SSE returned a single JSON body
      if (!fullMessage && sseBuffer.trim()) {
        try {
          const parsed = JSON.parse(sseBuffer);
          const content = parsed.choices?.[0]?.message?.content ?? "";
          if (content) fullMessage = content;
        } catch {
          // not parseable
        }
      }

      if (!fullMessage.trim() && abortController === this.abortController) {
        console.warn("[SarvamAgent] Empty stream — non-stream fallback");
        const fb = await this.fetchNonStreamCompletion(messages, abortController.signal);
        if (fb) fullMessage = fb;
      }

      let spoken = extractSpeak(fullMessage);
      if (
        shouldGuardFirstPrice &&
        typeof this.options.firstTurnMinQuote === "number" &&
        typeof this.options.targetMax === "number"
      ) {
        spoken = enforceFirstQuoteAboveTarget(spoken, this.options.firstTurnMinQuote, this.options.targetMax);
      }

      if (spoken && !streamedAudio) {
        stream.write(spoken);
      }
      console.log(`[SarvamAgent] Response: "${spoken.slice(0, 150)}"`);

      if (fullMessage) {
        const { message, metadata } = this.extract(fullMessage);
        this.addAssistantMessage(message, metadata);
      }

      stream.end();
      this.abortController = undefined;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[SarvamAgent] Error generating answer:", err);
      stream.end();
      this.abortController = undefined;
    }
  }

  cancel() {
    if (!this.abortController) return;
    this.log("Cancel");
    this.abortController.abort();
    this.abortController = undefined;
  }
}

// ---------------------------------------------------------------------------
// <speak> tag parser — deterministic, handles chunk boundaries
// ---------------------------------------------------------------------------

/** Extract spoken text from `<speak>...</speak>` in a complete string (non-stream). */
function extractSpeak(raw: string): string {
  if (!raw) return "";
  const match = raw.match(/<speak>([\s\S]*?)<\/speak>/);
  if (match) return match[1].trim();
  // Fallback: if model forgot tags, treat the whole raw text minus known markers
  // as spoken (graceful degradation, not silent failure).
  console.warn("[SarvamAgent] No <speak> tags found — using full content as fallback");
  return raw.replace(/\[SUGGEST:[^\]]*\]/g, "")
    .replace(/\[SUBGOAL:\d+\]/g, "")
    .replace(/\[SCENARIO_COMPLETE\]/g, "")
    .replace(/\[SCENE:[^\]]*\]/g, "")
    .trim();
}

/**
 * Streaming state machine that emits only text inside `<speak>...</speak>`.
 * Handles tags split across arbitrary chunk boundaries.
 */
class SpeakTagStreamParser {
  private inside = false;
  private tagBuf = "";

  private static OPEN = "<speak>";
  private static CLOSE = "</speak>";

  feed(chunk: string): string {
    let out = "";

    for (const ch of chunk) {
      this.tagBuf += ch;

      if (!this.inside) {
        // Looking for <speak>
        if (SpeakTagStreamParser.OPEN.startsWith(this.tagBuf)) {
          if (this.tagBuf === SpeakTagStreamParser.OPEN) {
            this.inside = true;
            this.tagBuf = "";
          }
          // else: partial match, keep buffering
        } else {
          // Not a tag match — discard (outside <speak>, we drop everything)
          this.tagBuf = "";
        }
      } else {
        // Inside <speak>, looking for </speak>
        if (SpeakTagStreamParser.CLOSE.startsWith(this.tagBuf)) {
          if (this.tagBuf === SpeakTagStreamParser.CLOSE) {
            this.inside = false;
            this.tagBuf = "";
          }
          // else: partial match of closing tag, keep buffering
        } else {
          // Not the start of </speak> — flush buffer as audible text
          out += this.tagBuf;
          this.tagBuf = "";
        }
      }
    }

    return out;
  }
}

function enforceFirstQuoteAboveTarget(
  text: string,
  firstTurnMinQuote: number,
  targetMax: number
): string {
  const lines = text.split("\n");
  const spokenIdx = lines.findIndex(
    (line) => line.trim().length > 0 && !line.trim().startsWith("[")
  );
  if (spokenIdx === -1) return text;

  const spoken = lines[spokenIdx];
  const match = spoken.match(/₹\s*\d+|\d+\s*(?:rupees?|rs|₹|रुपये|रुपए)/i);
  const value = match?.[0]?.match(/\d+/)?.[0];
  const quoted = value ? parseInt(value, 10) : NaN;

  if (Number.isFinite(quoted) && quoted > targetMax) return text;

  if (match && Number.isFinite(quoted)) {
    lines[spokenIdx] = spoken.replace(match[0], `₹${firstTurnMinQuote}`);
    return lines.join("\n");
  }

  const suffix = spoken.trim().endsWith(".") ? "" : ".";
  lines[spokenIdx] = `${spoken}${suffix} ₹${firstTurnMinQuote}.`;
  return lines.join("\n");
}
