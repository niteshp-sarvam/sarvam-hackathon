"use client";

import { useState, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Header,
  Text,
  Badge,
  Select,
  Slider,
  MetricCard,
  Loader,
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
  AnimatedCounter,
  AnimatePresence,
  LiveTranscript,
  VoiceWaveform,
  motion,
  PulseRing,
} from "@/components/motion";

interface PhraseItem {
  phrase: string;
  translation: string;
  difficulty: string;
}

export default function ShadowSpeakingPage() {
  const { targetLanguage, addGardenCard, addXp, markFoundationLesson } =
    useAppStore();
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);

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
  const [sessionStats, setSessionStats] = useState({
    attempted: 0,
    avgScore: 0,
    perfect: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

Format each phrase on a new line as:
PHRASE: [phrase in ${lang.name}]
TRANSLATION: [English translation]

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

      setPhrases(items.length > 0 ? items : getFallbackPhrases());
    } catch {
      setPhrases(getFallbackPhrases());
    }

    setCurrentIndex(0);
    setScore(null);
    setUserTranscript("");
    setSessionStats({ attempted: 0, avgScore: 0, perfect: 0 });
    setIsGenerating(false);
  }, [lang, difficulty]);

  function getFallbackPhrases(): PhraseItem[] {
    const greetings = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
    const langName = greetings?.name ?? "Hindi";
    return [
      { phrase: langName === "Tamil" ? "Vanakkam, eppadi irukeenga?" : langName === "Telugu" ? "Namaskaram, meeru ela unnaru?" : langName === "Kannada" ? "Namaskara, hēgiddīra?" : langName === "Bengali" ? "Nomoshkar, kemon achhen?" : langName === "Marathi" ? "Namaskar, kasa aahat?" : langName === "Malayalam" ? "Namaskaram, sugham aano?" : langName === "Gujarati" ? "Kem cho, majama?" : "Namaste, aap kaise hain?", translation: "Hello, how are you?", difficulty: "beginner" },
      { phrase: langName === "Tamil" ? "Nandri" : langName === "Telugu" ? "Dhanyavaadaalu" : langName === "Kannada" ? "Dhanyavaadagalu" : langName === "Bengali" ? "Dhonnobad" : langName === "Marathi" ? "Dhanyavaad" : langName === "Malayalam" ? "Nanni" : langName === "Gujarati" ? "Aabhaar" : "Dhanyavaad", translation: "Thank you", difficulty: "beginner" },
      { phrase: langName === "Tamil" ? "Enna vilai?" : langName === "Telugu" ? "Entha dhara?" : langName === "Kannada" ? "Ēnu bele?" : langName === "Bengali" ? "Koto dam?" : langName === "Marathi" ? "Kay bhaav aahe?" : langName === "Malayalam" ? "Entha vila?" : langName === "Gujarati" ? "Ketla nu?" : "Kitna hai?", translation: "How much is it?", difficulty: "beginner" },
    ];
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
      try {
        const tlRes = await fetch("/api/sarvam/transliterate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: transcript,
            source_language_code: `${lang.code}-IN`,
            target_language_code: "en-IN",
          }),
        });
        if (tlRes.ok) {
          const tlData = await tlRes.json();
          romanizedTranscript = tlData.transliterated_text || tlData.output || romanizedTranscript;
        }
      } catch {}

      const reference = phrases[currentIndex]?.phrase ?? "";
      const refWords = reference.toLowerCase().split(/\s+/);
      const nativeWords = transcript.toLowerCase().split(/\s+/);
      const romanWords = romanizedTranscript.toLowerCase().split(/\s+/);
      const matchCount = refWords.filter((rw: string) =>
        nativeWords.some((w: string) => rw.includes(w) || w.includes(rw)) ||
        romanWords.some((w: string) => rw.includes(w) || w.includes(rw))
      ).length;
      const newScore = Math.min(
        100,
        Math.round((matchCount / Math.max(refWords.length, 1)) * 100)
      );
      setScore(newScore);

      setSessionStats((prev) => ({
        attempted: prev.attempted + 1,
        avgScore: Math.round(
          (prev.avgScore * prev.attempted + newScore) / (prev.attempted + 1)
        ),
        perfect: prev.perfect + (newScore >= 90 ? 1 : 0),
      }));

      addXp(Math.round(newScore / 10));
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
      <Header
        type="main"
        left={{
          title: "Shadow Speaking",
          subtitle: `Match native ${lang?.name ?? "language"} pronunciation with real-time scoring`,
        }}
      />

      <Box display="flex" direction="column" gap={6} grow overflow="auto">
        {phrases.length === 0 ? (
          <Box display="flex" direction="column" gap={4}>
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
              <Button
                variant="primary"
                size="lg"
                onClick={generatePhrases}
                isLoading={isGenerating}
              >
                Start Practice
              </Button>
            </Box>

            <FadeIn>
              <Box
                p={8}
                rounded="lg"
                bg="surface-secondary"
                display="flex"
                direction="column"
                align="center"
                gap={4}
              >
                <Text variant="heading-sm">How Shadow Speaking Works</Text>
                <StaggerContainer style={{ maxWidth: 448, display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    "1. Listen to the native pronunciation",
                    "2. Record yourself saying the same phrase",
                    "3. Get instant pronunciation scoring",
                    "4. Low-scoring phrases are planted in your Mistake Garden",
                  ].map((step) => (
                    <StaggerItem key={step}>
                      <Text variant="body-sm">{step}</Text>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </Box>
            </FadeIn>
          </Box>
        ) : (
          <>
            <StaggerContainer style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <StaggerItem>
                <MetricCard
                  heading="Attempted"
                  value={sessionStats.attempted.toString()}
                />
              </StaggerItem>
              <StaggerItem>
                <MetricCard
                  heading="Avg Score"
                  value={`${sessionStats.avgScore}%`}
                />
              </StaggerItem>
              <StaggerItem>
                <MetricCard
                  heading="Perfect"
                  value={sessionStats.perfect.toString()}
                />
              </StaggerItem>
            </StaggerContainer>

            <Box display="flex" align="center" gap={4}>
              <Text variant="label-sm" tone="secondary">
                Playback Speed
              </Text>
              <div style={{ width: 192 }}>
                <Slider
                  min={0.5}
                  max={1.5}
                  step={0.25}
                  value={[speed]}
                  onValueChange={(v) => setSpeed(v[0])}
                />
              </div>
              <Text variant="label-sm">{speed}x</Text>
              <Text variant="label-sm" tone="tertiary">
                Phrase {currentIndex + 1} of {phrases.length}
              </Text>
            </Box>

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
                    <Badge variant="brand">{currentPhrase.difficulty}</Badge>
                    <FadeIn delay={0.1}>
                      <Text variant="heading-lg">
                        {currentPhrase.phrase}
                      </Text>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                      <Text variant="body-md" tone="secondary">
                        {currentPhrase.translation}
                      </Text>
                    </FadeIn>

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

                    {/* Waveform when recording */}
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
                            color="#EF4444"
                            barCount={32}
                            style={{ height: 40 }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Live transcript with word-by-word animation */}
                    <AnimatePresence>
                      {(userTranscript || isProcessing) && (
                        <LiveTranscript
                          text={userTranscript}
                          isListening={isProcessing}
                          label="Your pronunciation"
                          sublabel={englishTranslation ? `English: ${englishTranslation}` : undefined}
                          style={{
                            width: "100%",
                            background: "var(--tatva-background-tertiary, rgba(255,255,255,0.05))",
                          }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Score reveal */}
                    <AnimatePresence>
                      {score !== null && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Box display="flex" direction="column" align="center" gap={2}>
                            <Text
                              variant="heading-lg"
                              tone={score >= 80 ? "positive" : score >= 60 ? "warning" : "danger"}
                            >
                              <AnimatedCounter value={score} />%
                            </Text>
                            <ScaleIn delay={0.2}>
                              <Badge
                                variant={
                                  score >= 80
                                    ? "green"
                                    : score >= 60
                                      ? "yellow"
                                      : "red"
                                }
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
                                <Text variant="body-sm" tone="tertiary">
                                  Planted in your Mistake Garden for review
                                </Text>
                              </FadeIn>
                            )}
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>

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
                      {currentIndex < phrases.length - 1 && (
                        <HoverLift>
                          <Button variant="primary" onClick={nextPhrase}>
                            Next Phrase
                          </Button>
                        </HoverLift>
                      )}
                    </Box>
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
