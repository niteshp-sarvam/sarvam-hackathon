import { NextRequest, NextResponse } from "next/server";
import { speechToTextTranslate } from "@/lib/sarvam";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let audioBuffer: Buffer;
    let filename = "audio.webm";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) throw new Error("No audio file provided");
      audioBuffer = Buffer.from(await file.arrayBuffer());
      filename = file.name || "audio.webm";
    } else {
      const body = await req.json();
      if (!body.audio) throw new Error("No audio data provided");
      audioBuffer = Buffer.from(body.audio, "base64");
    }

    const result = await speechToTextTranslate(audioBuffer, filename);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Speech-to-text-translate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
