import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/sarvam";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, target_language_code, speaker, model, pace } = body;
    const result = await textToSpeech(input, target_language_code, {
      speaker,
      model,
      pace,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Text-to-speech failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
