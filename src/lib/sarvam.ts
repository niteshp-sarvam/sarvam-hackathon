const SARVAM_API_BASE = "https://api.sarvam.ai";

function getApiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY is not set");
  return key;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "api-subscription-key": getApiKey(),
  };
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 429 || res.status === 503) {
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
    return res;
  }
  return fetch(url, init);
}

export async function chatCompletion(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { model?: string; temperature?: number; max_tokens?: number }
) {
  const res = await fetchWithRetry(`${SARVAM_API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: options?.model ?? "sarvam-105b",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 1024,
      reasoning_effort: null,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Sarvam Chat API error: ${res.status} ${errBody}`);
  }
  return res.json();
}

function toBcp47(code: string): string {
  if (code.includes("-")) return code;
  if (code === "en") return "en-IN";
  return `${code}-IN`;
}

export async function translateText(
  input: string,
  sourceLang: string,
  targetLang: string
) {
  const res = await fetch(`${SARVAM_API_BASE}/translate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      input,
      source_language_code: toBcp47(sourceLang),
      target_language_code: toBcp47(targetLang),
      mode: "formal",
      enable_preprocessing: true,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Sarvam Translation API error: ${res.status} ${errBody}`);
  }
  return res.json();
}

export async function textToSpeech(
  input: string,
  targetLang: string,
  options?: { speaker?: string; model?: string; pace?: number }
) {
  const body: Record<string, unknown> = {
    text: input,
    target_language_code: targetLang,
    speaker: options?.speaker ?? "shubh",
    model: options?.model ?? "bulbul:v3",
  };
  if (options?.pace !== undefined) body.pace = options.pace;

  const res = await fetch(`${SARVAM_API_BASE}/text-to-speech`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Sarvam TTS API error: ${res.status} ${errBody}`);
  }
  return res.json();
}

export async function speechToText(
  audioBuffer: Buffer,
  languageCode: string,
  filename = "audio.webm"
) {
  const formData = new FormData();
  const ab = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([ab], { type: "audio/webm" });
  formData.append("file", blob, filename);
  formData.append("language_code", languageCode);
  formData.append("model", "saarika:v2.5");

  const res = await fetch(`${SARVAM_API_BASE}/speech-to-text`, {
    method: "POST",
    headers: {
      "api-subscription-key": getApiKey(),
    },
    body: formData,
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Sarvam STT API error: ${res.status} ${errBody}`);
  }
  return res.json();
}

export async function speechToTextTranslate(
  audioBuffer: Buffer,
  filename = "audio.webm"
) {
  const formData = new FormData();
  const ab = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([ab], { type: "audio/webm" });
  formData.append("file", blob, filename);
  formData.append("model", "saaras:v2.5");

  const res = await fetch(`${SARVAM_API_BASE}/speech-to-text-translate`, {
    method: "POST",
    headers: {
      "api-subscription-key": getApiKey(),
    },
    body: formData,
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Sarvam STT-Translate API error: ${res.status} ${errBody}`);
  }
  return res.json();
}

export async function transliterate(
  input: string,
  sourceLang: string,
  targetLang: string
) {
  const res = await fetch(`${SARVAM_API_BASE}/transliterate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      input,
      source_language_code: sourceLang,
      target_language_code: targetLang,
    }),
  });
  if (!res.ok)
    throw new Error(`Sarvam Transliteration API error: ${res.status}`);
  return res.json();
}

export async function detectLanguage(input: string) {
  const res = await fetch(`${SARVAM_API_BASE}/detect-language`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`Sarvam Language Detection API error: ${res.status}`);
  return res.json();
}
