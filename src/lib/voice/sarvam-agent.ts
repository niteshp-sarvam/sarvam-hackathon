import { Agent, AgentOptions } from "@micdrop/server";
import { PassThrough } from "stream";

export interface SarvamAgentOptions extends AgentOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  firstTurnMinQuote?: number;
  targetMax?: number;
}

const SARVAM_API_BASE = "https://api.sarvam.ai";
const DEFAULT_MODEL = "sarvam-m";

/**
 * Sarvam AI chat completion agent with streaming support.
 * Streams tokens via SSE from /v1/chat/completions, writes to a PassThrough
 * stream that Micdrop pipes into TTS.
 */
export class SarvamAgent extends Agent<SarvamAgentOptions> {
  private abortController?: AbortController;

  constructor(options: SarvamAgentOptions) {
    super(options);
  }

  protected async generateAnswer(stream: PassThrough): Promise<void> {
    console.log("[SarvamAgent] generateAnswer called, conversation length:", this.conversation.length);
    const abortController = new AbortController();
    this.abortController = abortController;

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
          max_tokens: this.options.maxTokens ?? 220,
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
        if (out) stream.write(out);
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
              .replace(/<think>[\s\S]*?<\/think>/g, "")
              .trim();
            if (cleaned && !shouldGuardFirstPrice) writeToTTS(cleaned);
          }
        } catch {
          // not parseable
        }
      }

      // Strip think blocks for conversation storage
      let cleanedMessage = fullMessage.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
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
      if (shouldGuardFirstPrice && cleanedMessage) {
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
