import { NextRequest, NextResponse } from "next/server";
import { transliterate } from "@/lib/sarvam";

export async function POST(req: NextRequest) {
  try {
    const { input, source_language_code, target_language_code } =
      await req.json();

    if (!input) {
      return NextResponse.json({ error: "No input provided" }, { status: 400 });
    }

    if (!source_language_code || !target_language_code) {
      return NextResponse.json(
        { error: "source_language_code and target_language_code are required" },
        { status: 400 }
      );
    }

    const result = await transliterate(
      input,
      source_language_code,
      target_language_code
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transliteration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
