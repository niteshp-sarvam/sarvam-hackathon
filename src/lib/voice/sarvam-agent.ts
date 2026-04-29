import { Agent, AgentOptions } from "@micdrop/server";
import { PassThrough } from "stream";

export interface SarvamAgentOptions extends AgentOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
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
                  if (before) stream.write(before);
                  text = "";
                }
              }
              if (!insideThink && text) {
                stream.write(text);
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
            const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            if (cleaned) stream.write(cleaned);
          }
        } catch {
          // not parseable
        }
      }

      // Strip think blocks for conversation storage
      const cleanedMessage = fullMessage.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
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
