"use client";

import { useEffect, useState } from "react";
import type { LanguageCode } from "./constants";

const CACHE_PREFIX = "bhashaverse:native:";
const inflight = new Map<string, Promise<string>>();

function cacheKey(roman: string, lang: LanguageCode | string) {
  return `${CACHE_PREFIX}${lang}:${roman.trim().toLowerCase()}`;
}

function readCache(roman: string, lang: LanguageCode | string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(cacheKey(roman, lang));
  } catch {
    return null;
  }
}

function writeCache(
  roman: string,
  lang: LanguageCode | string,
  value: string
) {
  if (typeof window === "undefined" || !value) return;
  try {
    window.localStorage.setItem(cacheKey(roman, lang), value);
  } catch {
    // ignore quota / privacy errors
  }
}

export async function getNativeText(
  roman: string,
  lang: LanguageCode | string
): Promise<string> {
  const trimmed = roman.trim();
  if (!trimmed || !lang) return trimmed;

  const cached = readCache(trimmed, lang);
  if (cached) return cached;

  const key = cacheKey(trimmed, lang);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch("/api/sarvam/transliterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: trimmed,
          source_language_code: "en-IN",
          target_language_code: `${lang}-IN`,
        }),
      });
      if (!res.ok) return trimmed;
      const data = await res.json();
      const out =
        (data.transliterated_text as string | undefined) ||
        (data.output as string | undefined) ||
        trimmed;
      writeCache(trimmed, lang, out);
      return out;
    } catch {
      return trimmed;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function useNativeText(
  roman: string | undefined | null,
  lang: LanguageCode | string | undefined | null
): { nativeText: string; loading: boolean } {
  const [nativeText, setNativeText] = useState<string>(() => {
    if (!roman || !lang) return "";
    return readCache(roman, lang) ?? "";
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (!roman || !lang) {
      setNativeText("");
      return;
    }
    const cached = readCache(roman, lang);
    if (cached) {
      setNativeText(cached);
      return;
    }
    setLoading(true);
    getNativeText(roman, lang)
      .then((out) => {
        if (cancelled) return;
        setNativeText(out);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roman, lang]);

  return { nativeText, loading };
}

const ttsInflight = new Map<string, Promise<string | null>>();

export async function fetchTtsAudio(
  text: string,
  lang: LanguageCode | string
): Promise<string | null> {
  if (!text || !lang) return null;
  const key = `tts:${lang}:${text}`;
  const existing = ttsInflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: text,
          target_language_code: `${lang}-IN`,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const audioB64: string | undefined = data.audios?.[0] ?? data.audio;
      return audioB64 ? `data:audio/wav;base64,${audioB64}` : null;
    } catch {
      return null;
    } finally {
      ttsInflight.delete(key);
    }
  })();

  ttsInflight.set(key, promise);
  return promise;
}

export async function speak(
  text: string,
  lang: LanguageCode | string
): Promise<HTMLAudioElement | null> {
  const url = await fetchTtsAudio(text, lang);
  if (!url) return null;
  const audio = new Audio(url);
  await audio.play().catch(() => {});
  return audio;
}
