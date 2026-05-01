import { Agent, AgentOptions } from "@micdrop/server";
import { PassThrough } from "stream";

export interface SarvamAgentOptions extends AgentOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  firstTurnMinQuote?: number;
  targetMax?: number;
  /**
   * When true (default), streams tokens to TTS as they arrive — lowest time-to-first-audio.
   * Set false (voice server: `?llmStream=0`) for a single non-stream completion (slower but avoids empty `delta.content`).
   */
  llmStream?: boolean;
}

const SARVAM_API_BASE = "https://api.sarvam.ai";
const DEFAULT_MODEL = "sarvam-105b";

/**
 * Sarvam AI chat completion for Micdrop → TTS.
 * Default: SSE streaming with `reasoning_effort: null` for fast time-to-first-audio.
 * Set `llmStream: false` for non-streaming (waits for full `message.content` first).
 */
export class SarvamAgent extends Agent<SarvamAgentOptions> {
  private abortController?: AbortController;

  constructor(options: SarvamAgentOptions) {
    super(options);
  }

  /** Non-stream completion; `generous` uses a larger token budget for retries after a failed stream. */
  private async fetchNonStreamCompletion(
    messages: { role: string; content: string }[],
    signal: AbortSignal,
    opts?: { generous?: boolean }
  ): Promise<string> {
    const base = this.options.maxTokens ?? 1024;
    const maxTok = opts?.generous
      ? Math.min(8192, Math.max(4096, Math.floor(base * 3)))
      : Math.min(8192, Math.max(2048, Math.floor(base * 2)));
    const res = await fetch(`${SARVAM_API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": this.options.apiKey,
      },
      body: JSON.stringify({
        model: this.options.model ?? DEFAULT_MODEL,
        messages,
        temperature: this.options.temperature ?? 0.7,
        max_tokens: maxTok,
        reasoning_effort: null,
        stream: false,
      }),
      signal,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(
        "[SarvamAgent] Non-stream request failed:",
        res.status,
        errBody.slice(0, 240)
      );
      return "";
    }
    const json = (await res.json()) as {
      choices?: Array<{
        finish_reason?: string;
        message?: {
          content?: string | null;
          reasoning_content?: string | null;
        };
      }>;
    };
    const ch = json.choices?.[0];
    const msg = ch?.message;
    const content = (msg?.content ?? "").trim();
    if (content) return content;
    const reasoning = (msg?.reasoning_content ?? "").trim();
    if (reasoning) {
      const spoken = pickSpokenFallbackFromReasoning(reasoning);
      if (spoken) {
        console.warn(
          "[SarvamAgent] message.content empty; using reasoning tail for speech (finish:",
          ch?.finish_reason ?? "?",
          ")"
        );
        return spoken;
      }
    }
    if (ch) {
      console.warn("[SarvamAgent] Empty choice (no content / no usable reasoning)", ch.finish_reason);
    }
    return "";
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

      // Prepend system prompt and enforce strict user/assistant alternation
      const messages: { role: string; content: string }[] = [];
      if (this.options.systemPrompt) {
        messages.push({ role: "system", content: this.options.systemPrompt });
      }
      for (const m of raw) {
        if (m.role === "system") continue;
        const prev = messages[messages.length - 1];
        if (prev && prev.role === m.role) {
          prev.content += " " + m.content;
        } else {
          messages.push(m);
        }
      }

      console.log("[SarvamAgent] Sending messages:", JSON.stringify(messages.map(m => ({ role: m.role, content: m.content.slice(0, 60) }))));

      const useLlmStream = this.options.llmStream !== false;
      if (!useLlmStream) {
        let fullMessage = await this.fetchNonStreamCompletion(
          messages,
          abortController.signal
        );
        if (!fullMessage.trim() && abortController === this.abortController) {
          console.warn("[SarvamAgent] Empty non-stream reply — retry with larger token budget");
          fullMessage = await this.fetchNonStreamCompletion(messages, abortController.signal, {
            generous: true,
          });
        }
        let cleanedMessage = fullMessage
          .replace(/<think>[\s\S]*?<\/redacted_thinking>/g, "")
          .trim();
        if (
          shouldGuardFirstPrice &&
          typeof this.options.firstTurnMinQuote === "number" &&
          typeof this.options.targetMax === "number"
        ) {
          cleanedMessage = enforceFirstQuoteAboveTarget(
            cleanedMessage,
            this.options.firstTurnMinQuote,
            this.options.targetMax
          );
        }
        const forTts = stripTtsControlMarkers(cleanedMessage);
        if (forTts) stream.write(forTts);
        console.log(`[SarvamAgent] Response (non-stream): "${cleanedMessage.slice(0, 150)}"`);
        if (cleanedMessage) {
          const { message, metadata } = this.extract(cleanedMessage);
          this.addAssistantMessage(message, metadata);
        }
        stream.end();
        this.abortController = undefined;
        return;
      }

      const res = await fetch(`${SARVAM_API_BASE}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": this.options.apiKey,
        },
        body: JSON.stringify({
          model: this.options.model ?? DEFAULT_MODEL,
          messages,
          // Lowered defaults: scenarios want tight, alive 1-3 sentence replies.
          // Old defaults (0.7 / 1024) encouraged the model to monologue.
          temperature: this.options.temperature ?? 0.7,
          max_tokens: this.options.maxTokens ?? 1024,
          reasoning_effort: null,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Sarvam Chat API error: ${res.status} ${errBody}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullMessage = "";
      let buffer = "";
      let insideThink = false;
      // Bracket filter state — suppresses `[...]` markers (e.g. [SUGGEST:...],
      // [STARS:N], [SCENARIO_COMPLETE]) from the TTS stream so the agent doesn't
      // read them aloud. Markers may span chunk boundaries.
      let insideBracket = false;
      let bracketBuf = "";
      const MAX_BRACKET_LEN = 320;
      let insideParen = false;
      let parenBuf = "";
      const MAX_PAREN_LEN = 320;
      let streamedAudio = false;

      const writeToTTS = (raw: string) => {
        if (!raw) return;
        let out = "";
        for (const ch of raw) {
          if (insideBracket) {
            bracketBuf += ch;
            if (ch === "]") {
              // bracket closed — drop the buffered marker content entirely
              insideBracket = false;
              bracketBuf = "";
            } else if (bracketBuf.length > MAX_BRACKET_LEN) {
              // bracket never closed — abandon suppression to avoid stalling
              insideBracket = false;
              bracketBuf = "";
            }
          } else if (insideParen) {
            parenBuf += ch;
            if (ch === ")") {
              insideParen = false;
              parenBuf = "";
            } else if (parenBuf.length > MAX_PAREN_LEN) {
              insideParen = false;
              parenBuf = "";
            }
          } else if (ch === "[") {
            insideBracket = true;
            bracketBuf = "[";
          } else if (ch === "(") {
            insideParen = true;
            parenBuf = "(";
          } else {
            out += ch;
          }
        }
        if (out) {
          stream.write(out);
          streamedAudio = true;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (abortController !== this.abortController) return;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

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

              // Strip <think>...</think> blocks from TTS stream
              let text = delta;
              if (insideThink) {
                const endIdx = text.indexOf("</think>");
                if (endIdx !== -1) {
                  insideThink = false;
                  text = text.slice(endIdx + 8);
                } else {
                  text = "";
                }
              }
              if (!insideThink) {
                const startIdx = text.indexOf("<think>");
                if (startIdx !== -1) {
                  insideThink = true;
                  const before = text.slice(0, startIdx);
                  if (before) writeToTTS(before);
                  text = "";
                }
              }
              if (!insideThink && text && !shouldGuardFirstPrice) {
                writeToTTS(text);
              }
            }
          } catch {
            // malformed JSON chunk, skip
          }
        }
      }

      // If streaming didn't work (non-streaming response), parse as regular JSON
      if (!fullMessage && buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer);
          const content = parsed.choices?.[0]?.message?.content ?? "";
          if (content) {
            fullMessage = content;
            const cleaned = content
              .replace(/<think>[\s\S]*?<\/redacted_thinking>/g, "")
              .trim();
            if (cleaned && !shouldGuardFirstPrice) writeToTTS(cleaned);
          }
        } catch {
          // not parseable
        }
      }

      if (!fullMessage.trim() && abortController === this.abortController) {
        console.warn(
          "[SarvamAgent] Empty stream content — non-stream fallback (reasoning may have used the token budget)"
        );
        const fb = await this.fetchNonStreamCompletion(messages, abortController.signal, {
          generous: true,
        });
        if (fb) fullMessage = fb;
      }

      // Strip think / reasoning wrapper blocks for conversation + TTS
      let cleanedMessage = fullMessage
        .replace(/<think>[\s\S]*?<\/redacted_thinking>/g, "")
        .trim();
      if (
        shouldGuardFirstPrice &&
        typeof this.options.firstTurnMinQuote === "number" &&
        typeof this.options.targetMax === "number"
      ) {
        cleanedMessage = enforceFirstQuoteAboveTarget(
          cleanedMessage,
          this.options.firstTurnMinQuote,
          this.options.targetMax
        );
      }
      if (cleanedMessage && !streamedAudio) {
        writeToTTS(cleanedMessage);
      }
      console.log(`[SarvamAgent] Response: "${cleanedMessage.slice(0, 150)}"`);

      if (cleanedMessage) {
        const { message, metadata } = this.extract(cleanedMessage);
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

/**
 * When `reasoning_effort` is null, Sarvam can still fill `reasoning_content` and leave `content` null
 * until the budget ends — use a short tail that is often the spoken line.
 */
function pickSpokenFallbackFromReasoning(reasoning: string): string {
  const lines = reasoning
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (line.startsWith("```")) continue;
    if (/^\d+[\.\)]\s*\*\*/.test(line)) continue;
    if (/^\*\*Analyze|^\*\*Brainstorm|^\*\*Deconstruct/i.test(line)) continue;
    if (line.length >= 10 && line.length <= 600) return line;
  }
  const tail = reasoning.replace(/\s+/g, " ").trim().slice(-450);
  return tail.length >= 8 ? tail : "";
}

/** Strip `[SCENARIO_COMPLETE]`-style markers and `(notes)` from text before TTS (single-shot). */
function stripTtsControlMarkers(raw: string): string {
  if (!raw) return "";
  let out = "";
  let insideBracket = false;
  let bracketBuf = "";
  const MAX_BRACKET_LEN = 320;
  let insideParen = false;
  let parenBuf = "";
  const MAX_PAREN_LEN = 320;
  for (const ch of raw) {
    if (insideBracket) {
      bracketBuf += ch;
      if (ch === "]") {
        insideBracket = false;
        bracketBuf = "";
      } else if (bracketBuf.length > MAX_BRACKET_LEN) {
        insideBracket = false;
        bracketBuf = "";
      }
    } else if (insideParen) {
      parenBuf += ch;
      if (ch === ")") {
        insideParen = false;
        parenBuf = "";
      } else if (parenBuf.length > MAX_PAREN_LEN) {
        insideParen = false;
        parenBuf = "";
      }
    } else if (ch === "[") {
      insideBracket = true;
      bracketBuf = "[";
    } else if (ch === "(") {
      insideParen = true;
      parenBuf = "(";
    } else {
      out += ch;
    }
  }
  return out;
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
