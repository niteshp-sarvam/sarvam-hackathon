"use client";

import { useState, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Header,
  Icon,
  Text,
  Badge,
  Loader,
  MetricCard,
  OptionGroup,
  OptionItem,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SUPPORTED_LANGUAGES, EAVESDROP_CONTEXTS, SCENARIO_ROOMS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  ScaleIn,
  HoverLift,
  SlideUpReveal,
  VoiceWaveform,
  motion,
  fireConfetti,
} from "@/components/motion";
import { GAME_COLORS } from "@/lib/theme-tokens";

interface ConversationLine {
  speaker: string;
  text: string;
  translation?: string;
  transliteration?: string;
}

interface EavesdropSession {
  context: string;
  title: string;
  lines: ConversationLine[];
  difficulty: string;
}

interface SpeakerConfig {
  name: string;
  voice: string;
}

const SPEAKER_PAIRS: Record<string, [SpeakerConfig, SpeakerConfig]> = {
  family:    [{ name: "Amma (Mother)", voice: "priya" },   { name: "Raju (Son)",   voice: "shubh" }],
  work:      [{ name: "Manager",      voice: "mani" },     { name: "Employee",     voice: "kavya" }],
  street:    [{ name: "Stranger 1",   voice: "rahul" },    { name: "Stranger 2",   voice: "ritu" }],
  market:    [{ name: "Vendor",       voice: "aditya" },   { name: "Customer",     voice: "neha" }],
  festival:  [{ name: "Elder",        voice: "roopa" },    { name: "Youth",        voice: "kabir" }],
  food:      [{ name: "Chef",         voice: "amit" },     { name: "Diner",        voice: "simran" }],
  transport: [{ name: "Driver",       voice: "varun" },    { name: "Passenger",    voice: "ishita" }],
  comedy:    [{ name: "Friend 1",     voice: "tarun" },    { name: "Friend 2",     voice: "shreya" }],
};

const SPEED_OPTIONS = [
  { label: "0.7x", value: 0.7 },
  { label: "1x",   value: 1.0 },
  { label: "1.3x", value: 1.3 },
] as const;

const CONTEXT_VISUALS: Record<string, { icon: Parameters<typeof Icon>[0]["name"]; gradient: string; border: string }> = {
  family: { icon: "chat-multiple", gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.06))", border: "rgba(245,158,11,0.2)" },
  work: { icon: "briefcase", gradient: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(28,176,246,0.06))", border: "rgba(99,102,241,0.2)" },
  street: { icon: "shuffle", gradient: "linear-gradient(135deg, rgba(28,176,246,0.12), rgba(99,102,241,0.06))", border: "rgba(28,176,246,0.2)" },
  market: { icon: "invoice", gradient: "linear-gradient(135deg, rgba(88,204,2,0.12), rgba(245,158,11,0.06))", border: "rgba(88,204,2,0.2)" },
  festival: { icon: "gift", gradient: "linear-gradient(135deg, rgba(206,130,255,0.12), rgba(99,102,241,0.06))", border: "rgba(206,130,255,0.2)" },
  food: { icon: "like", gradient: "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(245,158,11,0.06))", border: "rgba(239,68,68,0.18)" },
  transport: { icon: "shuffle", gradient: "linear-gradient(135deg, rgba(28,176,246,0.12), rgba(88,204,2,0.06))", border: "rgba(28,176,246,0.2)" },
  comedy: { icon: "chat", gradient: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(206,130,255,0.06))", border: "rgba(251,191,36,0.2)" },
};

export default function EavesdropPage() {
  const router = useRouter();
  const { targetLanguage, nativeLanguage, addXp, markFoundationLesson } = useAppStore();
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
  const nativeLang = SUPPORTED_LANGUAGES.find((l) => l.code === nativeLanguage);
  const nativeLangName = nativeLang?.name ?? "English";
  const nativeLangCode = nativeLanguage ?? "en";

  const [selectedContext, setSelectedContext] = useState("family");
  const [session, setSession] = useState<EavesdropSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set());
  const [currentLine, setCurrentLine] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingLineIdx, setPlayingLineIdx] = useState<number | null>(null);
  const [jumpInMode, setJumpInMode] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const generateConversation = useCallback(async (ctx?: string) => {
    const context = ctx ?? selectedContext;
    if (!lang) return;
    setIsGenerating(true);
    setRevealedLines(new Set());
    setCurrentLine(0);
    setJumpInMode(false);
    setSessionComplete(false);
    setSelectedContext(context);

    const pair = SPEAKER_PAIRS[context] ?? [{ name: "Person 1", voice: "shubh" }, { name: "Person 2", voice: "priya" }];
    const speaker1 = pair[0].name;
    const speaker2 = pair[1].name;

    try {
      const res = await fetch("/api/sarvam/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Generate a natural, everyday conversation in ${lang.name} between two people.
Context: ${context}
Speaker 1: ${speaker1}
Speaker 2: ${speaker2}

STRICT RULES:
- Write EXACTLY 8 lines of dialogue, alternating between the two speakers.
- Every dialogue line MUST be entirely in ${lang.name}. Do NOT mix in any English words, brand names, or random Latin-script words. Only use ${lang.script} script.
- Use natural, colloquial ${lang.name} — how real people actually talk.
- Include common greetings, expressions, and idioms.
- Each line should be 1-2 sentences max.
- Do NOT add any extra notes, explanations, or blank lines between dialogue lines.

OUTPUT FORMAT (follow exactly):
${speaker1}: <dialogue in ${lang.name}>
${speaker2}: <dialogue in ${lang.name}>
${speaker1}: <dialogue in ${lang.name}>
${speaker2}: <dialogue in ${lang.name}>
${speaker1}: <dialogue in ${lang.name}>
${speaker2}: <dialogue in ${lang.name}>
${speaker1}: <dialogue in ${lang.name}>
${speaker2}: <dialogue in ${lang.name}>

TITLE: <short descriptive title in ${nativeLangName}>
TRANSLATIONS:
1. <${nativeLangName} translation of line 1>
2. <${nativeLangName} translation of line 2>
3. <${nativeLangName} translation of line 3>
4. <${nativeLangName} translation of line 4>
5. <${nativeLangName} translation of line 5>
6. <${nativeLangName} translation of line 6>
7. <${nativeLangName} translation of line 7>
8. <${nativeLangName} translation of line 8>`,
            },
          ],
          temperature: 0.9,
          max_tokens: 2048,
        }),
      });

      if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "";

      const lines: ConversationLine[] = [];
      const rawLines = content.split("\n").filter((l: string) => l.trim());
      let title = `${context} conversation`;
      const translations: string[] = [];

      const speakerNames = [speaker1.toLowerCase(), speaker2.toLowerCase()];
      function matchSpeaker(name: string): string | null {
        const n = name.toLowerCase().trim();
        for (const s of speakerNames) {
          if (s === n || s.startsWith(n) || n.startsWith(s) || s.includes(n) || n.includes(s)) {
            return s === speakerNames[0] ? speaker1 : speaker2;
          }
        }
        return null;
      }

      let inTranslations = false;
      for (const line of rawLines) {
        if (line.startsWith("TITLE:")) {
          title = line.replace("TITLE:", "").trim();
          continue;
        }
        if (line.startsWith("TRANSLATIONS:") || line.startsWith("Translation")) {
          inTranslations = true;
          continue;
        }
        if (inTranslations) {
          const match = line.match(/^\d+[\.\)]\s*(.+)/);
          if (match) translations.push(match[1]);
          continue;
        }

        const speakerMatch = line.match(/^(.+?):\s*(.+)/);
        if (speakerMatch) {
          const name = speakerMatch[1].trim();
          const matched = matchSpeaker(name);
          if (matched) {
            lines.push({
              speaker: matched,
              text: speakerMatch[2].trim(),
            });
          }
        }
      }

      const finalLines = lines.slice(0, 8);
      if (finalLines.length === 0) throw new Error("No dialogue lines parsed from LLM response");

      finalLines.forEach((l, i) => {
        if (translations[i]) l.translation = translations[i];
      });

      const missingIdx = finalLines
        .map((l, i) => (l.translation ? -1 : i))
        .filter((i) => i !== -1);

      if (missingIdx.length > 0) {
        await Promise.allSettled(
          missingIdx.map(async (lineIdx) => {
            try {
              const tRes = await fetch("/api/sarvam/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  input: finalLines[lineIdx].text,
                  source_language_code: targetLanguage,
                  target_language_code: nativeLangCode,
                }),
              });
              if (tRes.ok) {
                const tData = await tRes.json();
                const translated = tData.translated_text?.trim();
                if (translated) finalLines[lineIdx].translation = translated;
              }
            } catch {}
          })
        );
      }

      await Promise.allSettled(
        finalLines.map(async (l) => {
          try {
            const trRes = await fetch("/api/sarvam/transliterate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                input: l.text,
                source_language_code: `${targetLanguage}-IN`,
                target_language_code: `${nativeLangCode}-IN`,
              }),
            });
            if (trRes.ok) {
              const trData = await trRes.json();
              const tlit = trData.transliterated_text?.trim();
              if (tlit) l.transliteration = tlit;
            }
          } catch {}
        })
      );

      setSession({ context, title, lines: finalLines, difficulty: "beginner" });
    } catch {
      const FALLBACK_GREETINGS: Record<string, [string, string, string, string]> = {
        hi: ["नमस्ते! कैसे हो?", "मैं ठीक हूँ, आप?", "बहुत अच्छा! आज क्या करना है?", "कुछ नहीं, बस घूमने चलते हैं।"],
        ta: ["வணக்கம்! எப்படி இருக்கீங்க?", "நான் நல்லா இருக்கேன், நீங்க?", "நல்லது! இன்னைக்கு என்ன செய்யலாம்?", "ஒன்னும் இல்ல, வெளியே போலாம்."],
        te: ["నమస్కారం! ఎలా ఉన్నారు?", "నేను బాగానే ఉన్నాను, మీరు?", "చాలా బాగుంది! ఈరోజు ఏం చేద్దాం?", "ఏమీ లేదు, బయటకు వెళ్దాం."],
        kn: ["ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಾ?", "ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ನೀವು?", "ತುಂಬಾ ಒಳ್ಳೆಯದು! ಇವತ್ತು ಏನು ಮಾಡೋಣ?", "ಏನಿಲ್ಲ, ಹೊರಗೆ ಹೋಗೋಣ."],
        bn: ["নমস্কার! কেমন আছেন?", "আমি ভালো আছি, আপনি?", "খুব ভালো! আজকে কী করা যায়?", "কিছু না, বাইরে যাই চলো।"],
        mr: ["नमस्कार! कसे आहात?", "मी ठीक आहे, तुम्ही?", "खूप छान! आज काय करायचं आहे?", "काही नाही, फिरायला जाऊया."],
        ml: ["നമസ്കാരം! സുഖമാണോ?", "ഞാൻ സുഖമാണ്, നിങ്ങളോ?", "വളരെ നല്ലത്! ഇന്ന് എന്താ ചെയ്യാം?", "ഒന്നുമില്ല, പുറത്ത് പോകാം."],
        gu: ["નમસ્તે! કેમ છો?", "હું સારો છું, તમે?", "બહુ સારું! આજે શું કરીશું?", "કંઈ નહીં, બહાર ફરવા જઈએ."],
      };
      const fb = targetLanguage ? FALLBACK_GREETINGS[targetLanguage] : undefined;
      if (!fb) {
        setSession({
          context,
          title: `Sample ${context} conversation`,
          lines: [],
          difficulty: "beginner",
        });
        setIsGenerating(false);
        return;
      }
      const fallbackLines: ConversationLine[] = [
        { speaker: pair[0].name, text: fb[0] },
        { speaker: pair[1].name, text: fb[1] },
        { speaker: pair[0].name, text: fb[2] },
        { speaker: pair[1].name, text: fb[3] },
      ];
      await Promise.allSettled(
        fallbackLines.map(async (l) => {
          try {
            const tRes = await fetch("/api/sarvam/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                input: l.text,
                source_language_code: targetLanguage,
                target_language_code: nativeLangCode,
              }),
            });
            if (tRes.ok) {
              const tData = await tRes.json();
              const translated = tData.translated_text?.trim();
              if (translated) l.translation = translated;
            }
          } catch {}
        })
      );
      await Promise.allSettled(
        fallbackLines.map(async (l) => {
          try {
            const trRes = await fetch("/api/sarvam/transliterate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                input: l.text,
                source_language_code: `${targetLanguage}-IN`,
                target_language_code: `${nativeLangCode}-IN`,
              }),
            });
            if (trRes.ok) {
              const trData = await trRes.json();
              const tlit = trData.transliterated_text?.trim();
              if (tlit) l.transliteration = tlit;
            }
          } catch {}
        })
      );
      setSession({
        context,
        title: `Sample ${context} conversation`,
        lines: fallbackLines,
        difficulty: "beginner",
      });
    }

    addXp(15);
    markFoundationLesson("listen");
    setIsGenerating(false);
  }, [lang, selectedContext, addXp, markFoundationLesson, targetLanguage, nativeLangCode, nativeLangName]);

  const playAbortRef = useRef(false);

  function getVoiceForSpeaker(speakerName: string, ctx: string): string {
    const pair = SPEAKER_PAIRS[ctx];
    if (!pair) return "shubh";
    if (speakerName.toLowerCase() === pair[0].name.toLowerCase()) return pair[0].voice;
    if (speakerName.toLowerCase() === pair[1].name.toLowerCase()) return pair[1].voice;
    return "shubh";
  }

  async function ttsForLine(text: string, voice: string, pace: number): Promise<string | null> {
    const langCode = `${targetLanguage}-IN`;
    const res = await fetch("/api/sarvam/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: text,
        target_language_code: langCode,
        speaker: voice,
        model: "bulbul:v3",
        pace,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.audios?.[0] ?? data.audio ?? null;
  }

  async function playLine(idx: number) {
    if (!session || !targetLanguage || isPlaying || playingLineIdx !== null) return;
    const line = session.lines[idx];
    if (!line) return;

    setPlayingLineIdx(idx);
    const voice = getVoiceForSpeaker(line.speaker, session.context);

    try {
      const audioB64 = await ttsForLine(line.text, voice, speed);
      if (audioB64) {
        const audio = new Audio(`data:audio/wav;base64,${audioB64}`);
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      }
    } catch {
      // ignore TTS errors for single line
    }
    setPlayingLineIdx(null);
  }

  async function playConversation() {
    if (!session || !targetLanguage) return;
    setIsPlaying(true);
    setCurrentLine(0);
    playAbortRef.current = false;

    for (let i = 0; i < session.lines.length; i++) {
      if (playAbortRef.current) break;
      setCurrentLine(i);
      setPlayingLineIdx(i);

      const line = session.lines[i];
      const voice = getVoiceForSpeaker(line.speaker, session.context);

      try {
        const audioB64 = await ttsForLine(line.text, voice, speed);
        if (audioB64 && !playAbortRef.current) {
          const audio = new Audio(`data:audio/wav;base64,${audioB64}`);
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
          });
        }
      } catch {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    setPlayingLineIdx(null);
    setIsPlaying(false);
    if (!playAbortRef.current) {
      setSessionComplete(true);
      setTimeout(() => fireConfetti("center"), 300);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header type="main" left={{ title: "Eavesdrop Loops" }} />

      <Box display="flex" direction="column" gap={6} grow overflow="auto" style={{ paddingBottom: 32 }}>
        {/* ===== SESSION VIEW ===== */}
        {session && !isGenerating && (
          <StaggerContainer style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Title + badges */}
            <StaggerItem>
              <Box display="flex" align="center" gap={3}>
                <Text variant="heading-sm">{session.title}</Text>
                <Badge variant="brand">{session.context}</Badge>
              </Box>
            </StaggerItem>

            {/* Action bar */}
            <StaggerItem>
              <Box display="flex" gap={3} align="center" wrap="wrap">
                <HoverLift>
                  <Button variant="primary" onClick={() => generateConversation()} icon="refresh">
                    New
                  </Button>
                </HoverLift>
                {!isPlaying ? (
                  <HoverLift>
                    <Button variant="secondary" onClick={playConversation} disabled={playingLineIdx !== null} icon="play">
                      Play Through
                    </Button>
                  </HoverLift>
                ) : (
                  <HoverLift>
                    <Button variant="outline" onClick={() => { playAbortRef.current = true; }} icon="stop">
                      Stop
                    </Button>
                  </HoverLift>
                )}
                {!jumpInMode && (
                  <HoverLift>
                    <Button variant="outline" onClick={() => setJumpInMode(true)} icon="chat">
                      Jump In
                    </Button>
                  </HoverLift>
                )}

                {/* Speed selector */}
                <Box display="flex" align="center" gap={1} ml={2}>
                  <Icon name="play" size="xs" tone="tertiary" />
                  <Box display="flex" rounded="full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tatva-border-secondary, rgba(255,255,255,0.08))" }}>
                    {SPEED_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSpeed(opt.value)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: speed === opt.value ? 600 : 400,
                          background: speed === opt.value ? "rgba(99,102,241,0.15)" : "transparent",
                          color: speed === opt.value ? "var(--tatva-content-primary)" : "var(--tatva-content-tertiary)",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </Box>
                </Box>
              </Box>
            </StaggerItem>

            {/* Waveform during playback */}
            {isPlaying && (
              <StaggerItem>
                <Box p={3} rounded="md" style={{ background: "rgba(28,176,246,0.06)", border: "1px solid rgba(28,176,246,0.15)" }}>
                  <VoiceWaveform active color={GAME_COLORS.info} barCount={32} style={{ height: 28 }} />
                </Box>
              </StaggerItem>
            )}

            {/* Chat bubble conversation */}
            <StaggerItem>
              <Box display="flex" direction="column" gap={3}>
                <Text variant="body-xs" tone="tertiary" style={{ textAlign: "center" }}>
                  Tap any line to reveal the {nativeLangName} translation
                </Text>
                {session.lines.map((line, i) => {
                  const isActive = playingLineIdx === i;
                  const isRevealed = revealedLines.has(i);
                  const isRight = i % 2 === 1;
                  const isBusy = isPlaying || playingLineIdx !== null;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      style={{
                        display: "flex",
                        justifyContent: isRight ? "flex-end" : "flex-start",
                      }}
                    >
                      <motion.div
                        animate={isActive ? { scale: [1, 1.01, 1] } : {}}
                        transition={isActive ? { duration: 1, repeat: Infinity } : {}}
                        style={{
                          maxWidth: "78%",
                          padding: "10px 16px",
                          borderRadius: isRight ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          background: isActive
                            ? "rgba(28,176,246,0.12)"
                            : isRight
                              ? "rgba(99,102,241,0.08)"
                              : "var(--tatva-surface-secondary, rgba(255,255,255,0.04))",
                          border: isActive
                            ? "1px solid rgba(28,176,246,0.3)"
                            : "1px solid var(--tatva-border-secondary, rgba(255,255,255,0.06))",
                          transition: "background 0.2s, border 0.2s",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setRevealedLines((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          })
                        }
                      >
                        <Box display="flex" align="center" justify="between" gap={2} style={{ marginBottom: 2 }}>
                          <Text variant="body-xs" tone="tertiary">
                            {line.speaker}
                          </Text>
                          <button
                            onClick={(e) => { e.stopPropagation(); playLine(i); }}
                            disabled={isBusy}
                            aria-label={`Play line by ${line.speaker}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              border: "none",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              background: isActive
                                ? "rgba(28,176,246,0.2)"
                                : "rgba(255,255,255,0.06)",
                              opacity: isBusy && !isActive ? 0.4 : 1,
                              transition: "all 0.15s",
                              flexShrink: 0,
                            }}
                          >
                            {isActive ? (
                              <VoiceWaveform active color={GAME_COLORS.info} barCount={4} style={{ height: 12, width: 16 }} />
                            ) : (
                              <Icon name="play" size="xs" tone="secondary" />
                            )}
                          </button>
                        </Box>
                        <Text variant="body-md">{line.text}</Text>
                        {line.transliteration && (
                          <Text variant="body-xs" tone="tertiary" style={{ fontStyle: "italic", marginTop: 2 }}>
                            {line.transliteration}
                          </Text>
                        )}
                        {isRevealed && line.translation && (
                          <FadeIn>
                            <Text variant="body-sm" tone="secondary" style={{ marginTop: 4 }}>
                              {line.translation}
                            </Text>
                          </FadeIn>
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </Box>
            </StaggerItem>

            {/* Jump-in mode */}
            {jumpInMode && (
              <SlideUpReveal>
                <Box
                  p={5}
                  rounded="lg"
                  display="flex"
                  direction="column"
                  gap={3}
                  style={{ border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.06)" }}
                >
                  <Box display="flex" align="center" gap={2}>
                    <Icon name="chat" size="sm" tone="brand" />
                    <Text variant="label-md">
                      Jump In — You are now {session.lines[1]?.speaker ?? "Speaker 2"}!
                    </Text>
                  </Box>
                  <Text variant="body-sm" tone="secondary">
                    Continue the conversation. Practice speaking in {lang?.name ?? "the target language"}.
                  </Text>
                  <Box display="flex" gap={3}>
                    <HoverLift>
                      <Button
                        variant="primary"
                        onClick={() => {
                          const jumpInRoom =
                            SCENARIO_ROOMS.find((r) => r.difficulty === "beginner") ?? SCENARIO_ROOMS[0];
                          router.push(`/scenario-rooms/${jumpInRoom.id}`);
                        }}
                      >
                        Open Scenario Room
                      </Button>
                    </HoverLift>
                    <Button variant="outline" onClick={() => setJumpInMode(false)}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              </SlideUpReveal>
            )}

            {/* Session complete */}
            {sessionComplete && !isPlaying && (
              <SlideUpReveal>
                <Box display="flex" direction="column" gap={6}>
                  <Box
                    p={6}
                    rounded="lg"
                    borderColor="primary"
                    bg="surface-secondary"
                    display="flex"
                    direction="column"
                    align="center"
                    gap={5}
                  >
                    <Icon name="success" size="lg" tone="success" />
                    <Text variant="heading-sm">Conversation Complete</Text>
                    <Badge
                      variant={
                        session && revealedLines.size >= session.lines.length
                          ? "green"
                          : revealedLines.size >= (session?.lines.length ?? 0) / 2
                            ? "yellow"
                            : "red"
                      }
                    >
                      {session && revealedLines.size >= session.lines.length
                        ? "Great listening!"
                        : revealedLines.size >= (session?.lines.length ?? 0) / 2
                          ? "Good effort!"
                          : "Try translating more lines next time"}
                    </Badge>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
                      <MetricCard heading="Lines" value={String(session?.lines.length ?? 0)} />
                      <MetricCard heading="Translated" value={String(revealedLines.size)} />
                    </div>
                  </Box>

                  <Box display="flex" direction="column" gap={3}>
                    <Text variant="label-md" tone="secondary">What&apos;s next?</Text>
                    <OptionGroup>
                      <OptionItem
                        label="New Conversation"
                        description="Listen to a different dialogue"
                        icon={<Icon name="refresh" size="sm" tone="secondary" />}
                        onClick={() => generateConversation()}
                      />
                      <OptionItem
                        label="Practice Speaking"
                        description="Shadow repeat phrases you heard"
                        icon={<Icon name="microphone" size="sm" tone="secondary" />}
                        onClick={() => router.push("/shadow-speaking")}
                      />
                      <OptionItem
                        label="Try a Scenario Room"
                        description="Practice real conversations"
                        icon={<Icon name="chat" size="sm" tone="secondary" />}
                        onClick={() => router.push("/scenario-rooms")}
                      />
                      <OptionItem
                        label="Back to Dashboard"
                        description="See your overall progress"
                        icon={<Icon name="home" size="sm" tone="secondary" />}
                        onClick={() => router.push("/dashboard")}
                      />
                    </OptionGroup>
                  </Box>
                </Box>
              </SlideUpReveal>
            )}
          </StaggerContainer>
        )}

        {/* ===== GENERATING STATE ===== */}
        {isGenerating && (
          <Box display="flex" align="center" justify="center" p={12} gap={4} direction="column">
            <Loader size="md" />
            <Text variant="body-sm" tone="secondary">
              Generating a natural conversation...
            </Text>
          </Box>
        )}

        {/* ===== EMPTY STATE — CONTEXT PICKER ===== */}
        {!session && !isGenerating && (
          <Box display="flex" direction="column" gap={5}>
            <Text variant="body-sm" tone="secondary">
              Pick a scene and listen in. Tap lines to see translations.
            </Text>

            <div className="grid grid-cols-2 gap-tatva-4">
              {EAVESDROP_CONTEXTS.map((ctx, i) => {
                const ctxPair = SPEAKER_PAIRS[ctx] ?? [{ name: "Person 1", voice: "shubh" }, { name: "Person 2", voice: "priya" }];
                const s1 = ctxPair[0].name;
                const s2 = ctxPair[1].name;
                const visuals = CONTEXT_VISUALS[ctx] ?? CONTEXT_VISUALS.family;
                return (
                  <ScaleIn key={ctx} delay={0.04 * i}>
                    <HoverLift onClick={() => generateConversation(ctx)}>
                      <Box
                        p={5}
                        rounded="lg"
                        display="flex"
                        direction="column"
                        gap={3}
                        style={{
                          background: visuals.gradient,
                          border: `1px solid ${visuals.border}`,
                          minHeight: 110,
                        }}
                      >
                        <Icon name={visuals.icon} size="md" tone="secondary" />
                        <Text variant="label-md">
                          {ctx.charAt(0).toUpperCase() + ctx.slice(1)}
                        </Text>
                        <Text variant="body-xs" tone="secondary">
                          {s1} & {s2}
                        </Text>
                      </Box>
                    </HoverLift>
                  </ScaleIn>
                );
              })}
            </div>
          </Box>
        )}
      </Box>
    </div>
  );
}
