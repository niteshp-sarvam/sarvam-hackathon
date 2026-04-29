import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/lib/sarvam";

const cache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, source_language_code, target_language_code } = body;

    const cacheKey = `${input}:${source_language_code}:${target_language_code}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.result);
    }

    const result = await translateText(
      input,
      source_language_code,
      target_language_code
    );

    cache.set(cacheKey, { result, timestamp: Date.now() });
    if (cache.size > 10000) {
      const oldest = [...cache.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0];
      if (oldest) cache.delete(oldest[0]);
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
