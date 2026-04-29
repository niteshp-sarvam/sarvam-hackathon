import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/sarvam";

const MAX_MESSAGES = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { messages, temperature, max_tokens } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    // Keep the system prompt + trim old messages to stay within limits
    if (messages.length > MAX_MESSAGES) {
      const systemMsg = messages[0]?.role === "system" ? [messages[0]] : [];
      const recent = messages.slice(-(MAX_MESSAGES - systemMsg.length));
      messages = [...systemMsg, ...recent];
    }

    const result = await chatCompletion(messages, { temperature, max_tokens });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat completion failed";
    console.error("[chat route]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
