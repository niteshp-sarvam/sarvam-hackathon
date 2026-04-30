"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Header,
  Icon,
  Text,
  Badge,
  Select,
  Skeleton,
  Slider,
  MetricCard,
  OptionGroup,
  OptionItem,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SUPPORTED_LANGUAGES, DIFFICULTY_LEVELS } from "@/lib/constants";
import { createCard } from "@/lib/fsrs";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  ScaleIn,
  HoverLift,
  ShimmerBorder,
  CountUpRing,
  AnimatedCounter,
  AnimatePresence,
  LiveTranscript,
  VoiceWaveform,
  motion,
  PulseRing,
  fireConfetti,
} from "@/components/motion";
import { GAME_COLORS } from "@/lib/theme-tokens";

type IconName = Parameters<typeof Icon>[0]["name"];

interface PhraseItem {
  phrase: string;
  translation: string;
  transliteration?: string;
  difficulty: string;
}

const STEPS: { icon: IconName; title: string; desc: string }[] = [
  { icon: "play", title: "Listen", desc: "Hear the native pronunciation" },
  { icon: "microphone", title: "Speak", desc: "Record yourself repeating" },
  { icon: "activity", title: "Score", desc: "Get instant feedback" },
  { icon: "plant", title: "Learn", desc: "Tough words go to Garden" },
];

export default function ShadowSpeakingPage() {
  const router = useRouter();
  const { targetLanguage, nativeLanguage, addGardenCard, addXp, markFoundationLesson } =
    useAppStore();
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
  const nativeLang = SUPPORTED_LANGUAGES.find((l) => l.code === nativeLanguage);
  const nativeLangName = nativeLang?.name ?? "English";
  const nativeLangCode = nativeLanguage ?? "en";

  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [englishTranslation, setEnglishTranslation] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState("beginner");
  const [speed, setSpeed] = useState(1.0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [gardenPlanted, setGardenPlanted] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    attempted: 0,
    avgScore: 0,
    perfect: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function addTransliterations(items: PhraseItem[]): Promise<PhraseItem[]> {
    if (!lang) return items;
    const results = await Promise.allSettled(
      items.map(async (item) => {
        try {
          const res = await fetch("/api/sarvam/transliterate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: item.phrase,
              source_language_code: `${lang.code}-IN`,
              target_language_code: "en-IN",
            }),
          });
          if (res.ok) {
            const data = await res.json();
            return data.transliterated_text || data.output || "";
          }
        } catch {}
        return "";
      })
    );
    return items.map((item, i) => ({
      ...item,
      transliteration: results[i].status === "fulfilled" ? results[i].value : "",
    }));
  }

  const generatePhrases = useCallback(async () => {
    if (!lang) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/sarvam/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Generate 10 phrases in ${lang.name} for a shadow speaking practice session.
Difficulty: ${difficulty}
- beginner: simple greetings, numbers, common words
- intermediate: full sentences, questions, polite requests
- advanced: complex sentences, idioms, fast speech patterns

STRICT RULES:
- Every PHRASE must be written ENTIRELY in native ${lang.script} script. Do NOT use romanized/Latin script. Do NOT transliterate.
- For example, always use ${lang.script} characters, never romanized Latin characters.

Format each phrase on a new line as:
PHRASE: [phrase in ${lang.name} using ${lang.script} script only]
TRANSLATION: [${nativeLangName} translation]

Generate exactly 10 pairs.`,
            },
          ],
          temperature: 0.8,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "";

      const items: PhraseItem[] = [];
      const lines = content.split("\n").filter((l: string) => l.trim());
      let currentPhrase = "";

      for (const line of lines) {
        if (line.startsWith("PHRASE:")) {
          currentPhrase = line.replace("PHRASE:", "").trim();
        } else if (line.startsWith("TRANSLATION:") && currentPhrase) {
          items.push({
            phrase: currentPhrase,
            translation: line.replace("TRANSLATION:", "").trim(),
            difficulty,
          });
          currentPhrase = "";
        }
      }

      const withTl = await addTransliterations(items.length > 0 ? items : getFallbackPhrases());
      setPhrases(withTl);
    } catch {
      const withTl = await addTransliterations(getFallbackPhrases());
      setPhrases(withTl);
    }

    setCurrentIndex(0);
    setScore(null);
    setUserTranscript("");
    setSessionComplete(false);
    setGardenPlanted(0);
    setSessionStats({ attempted: 0, avgScore: 0, perfect: 0 });
    setIsGenerating(false);
  }, [lang, difficulty]);

  function getFallbackPhrases(): PhraseItem[] {
    const FALLBACK: Record<string, [string, string][]> = {
      hi: [["नमस्ते, आप कैसे हैं?", "Hello, how are you?"], ["धन्यवाद", "Thank you"], ["कितना है?", "How much is it?"]],
      ta: [["வணக்கம், எப்படி இருக்கீங்க?", "Hello, how are you?"], ["நன்றி", "Thank you"], ["என்ன விலை?", "How much is it?"]],
      te: [["నమస్కారం, మీరు ఎలా ఉన్నారు?", "Hello, how are you?"], ["ధన్యవాదాలు", "Thank you"], ["ఎంత ధర?", "How much is it?"]],
      kn: [["ನಮಸ್ಕಾರ, ಹೇಗಿದ್ದೀರಾ?", "Hello, how are you?"], ["ಧನ್ಯವಾದಗಳು", "Thank you"], ["ಏನು ಬೆಲೆ?", "How much is it?"]],
      bn: [["নমস্কার, কেমন আছেন?", "Hello, how are you?"], ["ধন্যবাদ", "Thank you"], ["কত দাম?", "How much is it?"]],
      mr: [["नमस्कार, कसे आहात?", "Hello, how are you?"], ["धन्यवाद", "Thank you"], ["काय भाव आहे?", "How much is it?"]],
      ml: [["നമസ്കാരം, സുഖമാണോ?", "Hello, how are you?"], ["നന്ദി", "Thank you"], ["എന്ത വില?", "How much is it?"]],
      gu: [["નમસ્તે, કેમ છો?", "Hello, how are you?"], ["આભાર", "Thank you"], ["કેટલા નું?", "How much is it?"]],
    };
    const phrases = targetLanguage ? (FALLBACK[targetLanguage] ?? []) : [];
    return phrases.map(([phrase, translation]) => ({ phrase, translation, difficulty: "beginner" }));
  }

  async function playPhrase() {
    const phrase = phrases[currentIndex];
    if (!phrase || !lang) return;
    setIsPlaying(true);

    try {
      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: phrase.phrase,
          target_language_code: `${lang.code}-IN`,
        }),
      });

      if (!res.ok) throw new Error(`TTS error: ${res.status}`);
      const data = await res.json();
      if (data.audios?.[0]) {
        const audioBytes = atob(data.audios[0]);
        const arrayBuffer = new ArrayBuffer(audioBytes.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioBytes.length; i++) view[i] = audioBytes.charCodeAt(i);

        const blob = new Blob([arrayBuffer], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = speed;
        audio.onended = () => { URL.revokeObjectURL(url); setIsPlaying(false); };
        audio.onerror = () => { URL.revokeObjectURL(url); setIsPlaying(false); };
        audio.play();
      } else {
        setIsPlaying(false);
      }
    } catch {
      setIsPlaying(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processRecording(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setUserTranscript("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function processRecording(blob: Blob) {
    if (!lang) return;

    setEnglishTranslation("");
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", blob, "recording.webm");
    formData.append("language_code", `${lang.code}-IN`);

    const translateForm = new FormData();
    translateForm.append("file", blob, "recording.webm");

    try {
      const [sttRes, translateRes] = await Promise.allSettled([
        fetch("/api/sarvam/stt", { method: "POST", body: formData }),
        fetch("/api/sarvam/stt-translate", { method: "POST", body: translateForm }),
      ]);

      const sttData = sttRes.status === "fulfilled" && sttRes.value.ok ? await sttRes.value.json() : null;
      const translateData = translateRes.status === "fulfilled" && translateRes.value.ok ? await translateRes.value.json() : null;

      const transcript = sttData?.transcript ?? "Could not transcribe";
      setUserTranscript(transcript);

      if (translateData?.transcript) {
        setEnglishTranslation(translateData.transcript);
      }

      let romanizedTranscript = transcript;
      if (transcript && transcript !== "Could not transcribe") {
        try {
          const tlRes = await fetch("/api/sarvam/transliterate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: transcript,
              source_language_code: `${lang.code}-IN`,
              target_language_code: `${nativeLangCode}-IN`,
            }),
          });
          if (tlRes.ok) {
            const tlData = await tlRes.json();
            romanizedTranscript = tlData.transliterated_text || tlData.output || romanizedTranscript;
          }
        } catch {}
      }

      const NUM_WORDS_TO_DIGIT: Record<string, string> = {
        // Hindi / Marathi (shared Devanagari)
        "शून्य": "0", "एक": "1", "दो": "2", "तीन": "3", "चार": "4",
        "पांच": "5", "पाँच": "5", "छह": "6", "छे": "6", "सात": "7",
        "आठ": "8", "नौ": "9", "दस": "10",
        "दोन": "2", "पाच": "5", "सहा": "6", "नऊ": "9", "दहा": "10",
        // Tamil
        "ஒன்று": "1", "இரண்டு": "2", "மூன்று": "3", "நான்கு": "4",
        "ஐந்து": "5", "ஆறு": "6", "ஏழு": "7", "எட்டு": "8", "ஒன்பது": "9", "பத்து": "10",
        // Telugu
        "ఒకటి": "1", "రెండు": "2", "మూడు": "3", "నాలుగు": "4",
        "ఐదు": "5", "ఆరు": "6", "ఏడు": "7", "ఎనిమిది": "8", "తొమ్మిది": "9", "పది": "10",
        // Kannada
        "ಒಂದು": "1", "ಎರಡು": "2", "ಮೂರು": "3", "ನಾಲ್ಕು": "4",
        "ಐದು": "5", "ಆರು": "6", "ಏಳು": "7", "ಎಂಟು": "8", "ಒಂಬತ್ತು": "9", "ಹತ್ತು": "10",
        // Bengali
        "এক": "1", "দুই": "2", "তিন": "3", "চার": "4",
        "পাঁচ": "5", "ছয়": "6", "সাত": "7", "আট": "8", "নয়": "9", "দশ": "10",
        // Malayalam
        "ഒന്ന്": "1", "രണ്ട്": "2", "മൂന്ന്": "3", "നാല്": "4",
        "അഞ്ച്": "5", "ആറ്": "6", "ഏഴ്": "7", "എട്ട്": "8", "ഒൻപത്": "9", "പത്ത്": "10",
        // Gujarati
        "એક": "1", "બે": "2", "ત્રણ": "3", "ચાર": "4",
        "પાંચ": "5", "છ": "6", "સાત": "7", "આઠ": "8", "નવ": "9", "દસ": "10",
        // Romanized
        "ek": "1", "do": "2", "teen": "3", "char": "4", "paanch": "5", "panch": "5",
        "cheh": "6", "chhe": "6", "saat": "7", "aath": "8", "nau": "9", "das": "10",
        "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
        "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
      };

      const stripPunctuation = (s: string) => s.replace(/[,.\?!;:।॥'"()–—\-]/g, "");
      const normalizeWord = (w: string) => {
        const clean = stripPunctuation(w).toLowerCase();
        return NUM_WORDS_TO_DIGIT[clean] ?? clean;
      };
      const tokenize = (s: string) =>
        s.split(/\s+/).map(normalizeWord).filter(Boolean);

      const reference = phrases[currentIndex]?.phrase ?? "";
      const refWords = tokenize(reference);
      const nativeWords = tokenize(transcript);
      const romanWords = tokenize(romanizedTranscript);
      const userWords = nativeWords.length >= romanWords.length ? nativeWords : romanWords;

      const fuzzyMatch = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);

      const recallHits = refWords.filter((rw) =>
        userWords.some((w) => fuzzyMatch(rw, w))
      ).length;
      const precisionHits = userWords.filter((uw) =>
        refWords.some((rw) => fuzzyMatch(rw, uw))
      ).length;

      const recall = recallHits / Math.max(refWords.length, 1);
      const precision = precisionHits / Math.max(userWords.length, 1);
      const f1 = recall + precision > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;
      const newScore = Math.min(100, Math.round(f1 * 100));
      setScore(newScore);

      setSessionStats((prev) => ({
        attempted: prev.attempted + 1,
        avgScore: Math.round(
          (prev.avgScore * prev.attempted + newScore) / (prev.attempted + 1)
        ),
        perfect: prev.perfect + (newScore >= 90 ? 1 : 0),
      }));

      const xpEarned = Math.round(newScore / 10);
      if (xpEarned > 0) addXp(xpEarned);
      markFoundationLesson("shadow");

      if (newScore < 60) {
        addGardenCard(
          createCard(
            phrases[currentIndex].phrase,
            phrases[currentIndex].translation,
            lang.code,
            "pronunciation"
          )
        );
        setGardenPlanted((c) => c + 1);
      }
    } catch {
      setUserTranscript("Error processing audio");
    }
    setIsProcessing(false);
  }

  function nextPhrase() {
    if (currentIndex < phrases.length - 1) {
      setCurrentIndex((i) => i + 1);
      setScore(null);
      setUserTranscript("");
      setEnglishTranslation("");
    }
  }

  const currentPhrase = phrases[currentIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header type="main" left={{ title: "Shadow Speaking" }} />

      <Box display="flex" direction="column" gap={6} grow overflow="auto" style={{ paddingBottom: 32 }}>
        {phrases.length === 0 ? (
          <Box display="flex" direction="column" gap={6}>
            {isGenerating && (
              <Box display="flex" direction="column" gap={3} p={6} rounded="lg" bg="surface-secondary">
                <Skeleton height={20} width={220} />
                <Skeleton height={56} />
                <Skeleton height={16} width={320} />
                <Box display="flex" gap={3} mt={2}>
                  <Skeleton height={36} width={120} />
                  <Skeleton height={36} width={120} />
                </Box>
              </Box>
            )}
            {/* Setup controls */}
            <Box display="flex" gap={4} align="end">
              <Box grow>
                <Select
                  label="Difficulty"
                  options={DIFFICULTY_LEVELS.map((d) => ({
                    label: d.charAt(0).toUpperCase() + d.slice(1),
                    value: d,
                  }))}
                  value={difficulty}
                  onValueChange={setDifficulty}
                />
              </Box>
              <ShimmerBorder borderRadius={12}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={generatePhrases}
                  isLoading={isGenerating}
                >
                  Start Practice
                </Button>
              </ShimmerBorder>
            </Box>

            {/* Step cards */}
            <StaggerContainer style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {STEPS.map((step, i) => (
                <StaggerItem key={step.title}>
                  <HoverLift>
                    <Box
                      p={5}
                      rounded="lg"
                      display="flex"
                      direction="column"
                      align="center"
                      gap={3}
                      style={{
                        background: i === 0
                          ? "rgba(28,176,246,0.08)"
                          : i === 1
                            ? "rgba(99,102,241,0.08)"
                            : i === 2
                              ? "rgba(245,158,11,0.08)"
                              : "rgba(88,204,2,0.08)",
                        border: `1px solid ${
                          i === 0
                            ? "rgba(28,176,246,0.2)"
                            : i === 1
                              ? "rgba(99,102,241,0.2)"
                              : i === 2
                                ? "rgba(245,158,11,0.2)"
                                : "rgba(88,204,2,0.2)"
                        }`,
                        minHeight: 120,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "var(--tatva-surface-secondary)",
                          border: "1px solid var(--tatva-border-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {i + 1}
                      </div>
                      <Icon name={step.icon} size="md" tone="secondary" />
                      <Text variant="label-md">{step.title}</Text>
                      <Text variant="body-xs" tone="secondary" style={{ textAlign: "center" }}>
                        {step.desc}
                      </Text>
                    </Box>
                  </HoverLift>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </Box>
        ) : (
          <>
            {!sessionComplete && <>
            {/* Session stats */}
            <StaggerContainer style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {([
                { heading: "Attempted", value: sessionStats.attempted, icon: "activity" as IconName, iconColor: GAME_COLORS.info },
                { heading: "Avg Score", value: sessionStats.avgScore, icon: "favourite" as IconName, iconColor: GAME_COLORS.warning, suffix: "%" },
                { heading: "Perfect", value: sessionStats.perfect, icon: "success" as IconName, iconColor: GAME_COLORS.brand },
              ]).map((stat) => (
                <StaggerItem key={stat.heading}>
                  <HoverLift>
                    <Box
                      p={5}
                      rounded="lg"
                      borderColor="primary"
                      display="flex"
                      direction="column"
                      gap={3}
                      style={{ height: "100%" }}
                    >
                      <Box display="flex" align="center" justify="between">
                        <Text variant="body-xs" tone="secondary">{stat.heading}</Text>
                        <Icon name={stat.icon} size="sm" tone="secondary" />
                      </Box>
                      <Text variant="heading-sm">
                        <AnimatedCounter value={stat.value} suffix={stat.suffix ?? ""} />
                      </Text>
                    </Box>
                  </HoverLift>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Speed & phrase counter */}
            <Box display="flex" align="center" gap={4}>
              <Text variant="label-sm" tone="secondary">Speed</Text>
              <div style={{ width: 160 }}>
                <Slider
                  min={0.5}
                  max={1.5}
                  step={0.25}
                  value={[speed]}
                  onValueChange={(v) => setSpeed(v[0])}
                />
              </div>
              <Text variant="label-sm">{speed}x</Text>
              <div style={{ flex: 1 }} />
              <Text variant="label-sm" tone="tertiary">
                Phrase {currentIndex + 1} / {phrases.length}
              </Text>
            </Box>

            {/* Phrase practice card */}
            <AnimatePresence mode="wait">
              {currentPhrase && (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <Box
                    p={8}
                    rounded="lg"
                    borderColor="primary"
                    bg="surface-secondary"
                    display="flex"
                    direction="column"
                    align="center"
                    gap={6}
                  >
                    <Badge variant="brand">
                      {currentPhrase.difficulty.charAt(0).toUpperCase() +
                        currentPhrase.difficulty.slice(1)}
                    </Badge>
                    <ScaleIn>
                      <Text
                        variant="heading-lg"
                        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
                      >
                        {currentPhrase.phrase}
                      </Text>
                    </ScaleIn>
                    {currentPhrase.transliteration && (
                      <FadeIn delay={0.05}>
                        <Text variant="body-sm" tone="tertiary" style={{ fontStyle: "italic" }}>
                          {currentPhrase.transliteration}
                        </Text>
                      </FadeIn>
                    )}
                    <FadeIn delay={0.1}>
                      <Text variant="body-md" tone="secondary">
                        {currentPhrase.translation}
                      </Text>
                    </FadeIn>

                    {/* Listen / Record buttons */}
                    <Box display="flex" gap={4} align="center">
                      <HoverLift>
                        <Button
                          variant="secondary"
                          onClick={playPhrase}
                          isLoading={isPlaying}
                          icon="play"
                        >
                          Listen
                        </Button>
                      </HoverLift>

                      {!isRecording ? (
                        <HoverLift>
                          <Button
                            variant="primary"
                            onClick={startRecording}
                            icon="microphone"
                          >
                            Record
                          </Button>
                        </HoverLift>
                      ) : (
                        <PulseRing color="rgba(239,68,68,0.4)">
                          <Button
                            variant="destructive"
                            onClick={stopRecording}
                            icon="stop"
                          >
                            Stop
                          </Button>
                        </PulseRing>
                      )}
                    </Box>

                    {/* Waveform */}
                    <AnimatePresence>
                      {isRecording && (
                        <motion.div
                          initial={{ opacity: 0, scaleY: 0 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          exit={{ opacity: 0, scaleY: 0 }}
                          style={{ width: "100%" }}
                        >
                          <VoiceWaveform
                            active
                            color={GAME_COLORS.dangerAlt}
                            barCount={32}
                            style={{ height: 40 }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Transcript */}
                    <AnimatePresence>
                      {(userTranscript || isProcessing) && (
                        <LiveTranscript
                          text={userTranscript}
                          isListening={isProcessing}
                          label="Your pronunciation"
                          sublabel={englishTranslation ? `Translation: ${englishTranslation}` : undefined}
                          style={{
                            width: "100%",
                            background: "var(--tatva-background-tertiary, rgba(255,255,255,0.05))",
                          }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Score reveal with CountUpRing */}
                    <AnimatePresence>
                      {score !== null && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Box display="flex" direction="column" align="center" gap={3}>
                            <CountUpRing
                              percent={score}
                              size={80}
                              strokeWidth={6}
                              color={score >= 80 ? GAME_COLORS.success : score >= 60 ? GAME_COLORS.warning : GAME_COLORS.dangerAlt}
                            >
                              <span
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: score >= 80 ? GAME_COLORS.success : score >= 60 ? GAME_COLORS.warning : GAME_COLORS.dangerAlt,
                                }}
                              >
                                <AnimatedCounter value={score} suffix="%" />
                              </span>
                            </CountUpRing>
                            <ScaleIn delay={0.2}>
                              <Badge
                                variant={score >= 80 ? "green" : score >= 60 ? "yellow" : "red"}
                              >
                                {score >= 90
                                  ? "Perfect!"
                                  : score >= 80
                                    ? "Great!"
                                    : score >= 60
                                      ? "Good try"
                                      : "Keep practicing"}
                              </Badge>
                            </ScaleIn>
                            {score < 60 && (
                              <FadeIn delay={0.3}>
                                <Box display="flex" align="center" gap={2}>
                                  <Icon name="plant" size="sm" tone="success" />
                                  <Badge variant="green">Planted in garden</Badge>
                                </Box>
                              </FadeIn>
                            )}
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <Box display="flex" gap={4}>
                      <HoverLift>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setScore(null);
                            setUserTranscript("");
                          }}
                        >
                          Try Again
                        </Button>
                      </HoverLift>
                      {currentIndex < phrases.length - 1 ? (
                        <HoverLift>
                          <Button variant="primary" onClick={nextPhrase}>
                            Next Phrase
                          </Button>
                        </HoverLift>
                      ) : score !== null ? (
                        <HoverLift>
                          <Button
                            variant="primary"
                            onClick={() => {
                              setSessionComplete(true);
                              fireConfetti("center");
                            }}
                          >
                            Finish Session
                          </Button>
                        </HoverLift>
                      ) : null}
                    </Box>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            </>}

            {/* Session complete summary */}
            <AnimatePresence>
              {sessionComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Box display="flex" direction="column" gap={8}>
                    <Box
                      p={8}
                      rounded="lg"
                      borderColor="primary"
                      bg="surface-secondary"
                      display="flex"
                      direction="column"
                      align="center"
                      gap={6}
                    >
                      <ScaleIn>
                        <Icon name="success" size="lg" tone="success" />
                      </ScaleIn>
                      <Text variant="heading-md">Session Complete</Text>
                      <Badge
                        variant={sessionStats.avgScore >= 85 ? "green" : sessionStats.avgScore >= 60 ? "yellow" : "red"}
                      >
                        {sessionStats.avgScore >= 85
                          ? "Amazing session!"
                          : sessionStats.avgScore >= 60
                            ? "Great progress!"
                            : "Keep at it!"}
                      </Badge>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%" }}>
                        <MetricCard heading="Attempted" value={String(sessionStats.attempted)} />
                        <MetricCard heading="Avg Score" value={`${sessionStats.avgScore}%`} />
                        <MetricCard heading="Perfect" value={String(sessionStats.perfect)} />
                      </div>

                      {gardenPlanted > 0 && (
                        <FadeIn delay={0.2}>
                          <Box display="flex" align="center" gap={2}>
                            <Icon name="plant" size="sm" tone="success" />
                            <Text variant="body-sm" tone="secondary">
                              {gardenPlanted} word{gardenPlanted > 1 ? "s" : ""} planted in your Garden
                            </Text>
                          </Box>
                        </FadeIn>
                      )}
                    </Box>

                    <FadeIn delay={0.3}>
                      <Box display="flex" direction="column" gap={3}>
                        <Text variant="label-md" tone="secondary">What&apos;s next?</Text>
                        <OptionGroup>
                          <OptionItem
                            label="Practice Again"
                            description="Start a new session with the same difficulty"
                            icon={<Icon name="refresh" size="sm" tone="secondary" />}
                            onClick={generatePhrases}
                          />
                          {gardenPlanted > 0 && (
                            <OptionItem
                              label="Review in Garden"
                              description={`Review ${gardenPlanted} word${gardenPlanted > 1 ? "s" : ""} you planted`}
                              icon={<Icon name="plant" size="sm" tone="secondary" />}
                              onClick={() => router.push("/garden")}
                            />
                          )}
                          <OptionItem
                              label="Try Eavesdrop"
                              description="Practice listening to conversations"
                              icon={<Icon name="volume-high" size="sm" tone="secondary" />}
                              onClick={() => router.push("/eavesdrop")}
                            />
                          <OptionItem
                            label="Back to Dashboard"
                            description="See your overall progress"
                            icon={<Icon name="home" size="sm" tone="secondary" />}
                            onClick={() => router.push("/dashboard")}
                          />
                        </OptionGroup>
                      </Box>
                    </FadeIn>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </Box>
    </div>
  );
}
