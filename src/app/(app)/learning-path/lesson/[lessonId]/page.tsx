"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Header,
  Icon,
  Text,
  Badge,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { getLessonById } from "@/lib/curriculum";
import type { VocabSeed } from "@/lib/curriculum";
import { createCard } from "@/lib/fsrs";
import { useNativeText, speak } from "@/lib/native-text";
import { GAME_COLORS, GAME_GRADIENTS } from "@/lib/theme-tokens";
import {
  FadeIn,
  ScaleIn,
  HoverLift,
  AnimatePresence,
  LiveTranscript,
  VoiceWaveform,
  PulseRing,
  motion,
  fireConfetti,
} from "@/components/motion";

type IconName = Parameters<typeof Icon>[0]["name"];

// --- Lesson Recap row ---
function RecapRow({ seed, language }: { seed: VocabSeed; language: string }) {
  const { nativeText: fetched } = useNativeText(
    seed.nativeText ? null : seed.word,
    seed.nativeText ? null : language
  );
  const native = seed.nativeText || fetched || seed.word;
  const [playing, setPlaying] = useState(false);

  async function play() {
    if (playing) return;
    setPlaying(true);
    const audio = await speak(native, language);
    if (audio) {
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
    } else {
      setPlaying(false);
    }
  }

  return (
    <Box
      display="flex"
      align="center"
      gap={3}
      p={4}
      rounded="md"
      borderColor="primary"
      bg="surface-secondary"
      style={{ width: "100%" }}
    >
      <Button
        variant="ghost"
        size="sm"
        icon={playing ? "pause" : "audio-book"}
        onClick={play}
      >
        {""}
      </Button>
      <Box display="flex" direction="column" gap={1} grow>
        <Text variant="label-md">{native}</Text>
        {native !== seed.word && (
          <Text variant="body-xs" tone="tertiary">{seed.word}</Text>
        )}
      </Box>
      <Text variant="body-sm" tone="secondary">{seed.translation}</Text>
    </Box>
  );
}

// --- Vocab Lesson ---
function VocabCard({
  seed,
  language,
  revealed,
  onReveal,
  onRate,
}: {
  seed: VocabSeed;
  language: string;
  revealed: boolean;
  onReveal: () => void;
  onRate: (r: number) => void;
}) {
  const { nativeText: fetched, loading } = useNativeText(
    seed.nativeText ? null : seed.word,
    seed.nativeText ? null : language
  );
  const native = seed.nativeText || fetched;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const playAudio = useCallback(async () => {
    if (playing) return;
    setPlaying(true);
    try {
      audioRef.current?.pause();
      const audio = await speak(native || seed.word, language);
      if (audio) {
        audioRef.current = audio;
        audio.onended = () => setPlaying(false);
        audio.onerror = () => setPlaying(false);
      } else {
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  }, [native, seed.word, language, playing]);

  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (revealed && !autoPlayedRef.current && (native || !loading)) {
      autoPlayedRef.current = true;
      playAudio();
    }
  }, [revealed, native, loading, playAudio]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <Box
      p={10}
      rounded="lg"
      borderColor="primary"
      bg="surface-secondary"
      display="flex"
      direction="column"
      align="center"
      gap={6}
    >
      <Badge variant="brand">{seed.category}</Badge>

      <Box display="flex" direction="column" align="center" gap={2}>
        {native ? (
          <Text variant="heading-lg">{native}</Text>
        ) : loading ? (
          <Text variant="heading-lg" tone="tertiary">…</Text>
        ) : (
          <Text variant="heading-lg">{seed.word}</Text>
        )}
        {native && native !== seed.word && (
          <Text variant="body-sm" tone="tertiary">{seed.word}</Text>
        )}
      </Box>

      <Button
        variant="ghost"
        size="md"
        icon={playing ? "pause" : "audio-book"}
        onClick={playAudio}
      >
        {playing ? "Playing…" : "Listen"}
      </Button>

      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="reveal-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button variant="secondary" size="lg" onClick={onReveal}>
              Tap to reveal
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="answer"
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Box display="flex" direction="column" align="center" gap={6}>
              <Text variant="body-lg" tone="secondary">{seed.translation}</Text>
              <Text variant="label-sm" tone="tertiary">How well did you know it?</Text>
              <Box display="flex" gap={3}>
                {[
                  { r: 1, label: "Forgot", icon: "error" as IconName, color: GAME_COLORS.danger },
                  { r: 2, label: "Hard", icon: "warning" as IconName, color: GAME_COLORS.warningAlt },
                  { r: 3, label: "Good", icon: "check" as IconName, color: GAME_COLORS.success },
                  { r: 4, label: "Easy", icon: "favourite" as IconName, color: GAME_COLORS.info },
                ].map((opt) => (
                  <HoverLift key={opt.r} onClick={() => onRate(opt.r)}>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: opt.color,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        minWidth: 64,
                      }}
                    >
                      <Icon name={opt.icon} size="md" tone="inverse" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{opt.label}</span>
                    </div>
                  </HoverLift>
                ))}
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}

function VocabRunner({
  seeds,
  language,
  onComplete,
}: {
  seeds: VocabSeed[];
  language: string;
  onComplete: (reviewed: number, ratings?: number[]) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<number[]>([]);
  const completedRef = useRef(false);
  const current = seeds[idx];
  const done = idx >= seeds.length;

  useEffect(() => {
    if (done && !completedRef.current) {
      completedRef.current = true;
      onComplete(ratings.length, ratings);
    }
  }, [done, onComplete, ratings.length, ratings]);

  if (done) return null;

  function rate(r: number) {
    setRatings((prev) => [...prev, r]);
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  return (
    <Box display="flex" direction="column" gap={6} align="center">
      <Box display="flex" align="center" gap={3}>
        <Text variant="label-sm" tone="tertiary">
          {idx + 1} / {seeds.length}
        </Text>
        <Box grow rounded="full" bg="tertiary" overflow="hidden" h={2} style={{ minWidth: 160 }}>
          <div
            style={{
              height: "100%",
              width: `${((idx + 1) / seeds.length) * 100}%`,
              borderRadius: 9999,
              background: GAME_GRADIENTS.successSoft,
              transition: "width 0.3s ease",
            }}
          />
        </Box>
      </Box>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          style={{ minWidth: 320, maxWidth: 480, width: "100%" }}
        >
          <VocabCard
            seed={current}
            language={language}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onRate={rate}
          />
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}

// --- Listen Lesson ---
function ListenRunner({
  seeds,
  language,
  onComplete,
}: {
  seeds: VocabSeed[];
  language: string;
  onComplete: (correct: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const completedRef = useRef(false);
  const current = seeds[idx];
  const done = idx >= seeds.length;

  const generateOptions = useCallback(() => {
    if (!current) return;
    const wrong = seeds
      .filter((s) => s.word !== current.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((s) => s.translation);
    const all = [current.translation, ...wrong].sort(() => Math.random() - 0.5);
    setOptions(all.length >= 2 ? all : [current.translation, "Something else"]);
  }, [current, seeds]);

  useEffect(() => {
    if (!done) {
      generateOptions();
      setSelected(null);
    }
  }, [idx, done, generateOptions]);

  useEffect(() => {
    if (done && !completedRef.current) {
      completedRef.current = true;
      onComplete(correct);
    }
  }, [done, onComplete, correct]);

  if (done) return null;

  async function playAudio() {
    setPlaying(true);
    try {
      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: current.word,
          target_language_code: `${language}-IN`,
        }),
      });
      if (!res.ok) throw new Error(`TTS error: ${res.status}`);
      const data = await res.json();
      const audioB64 = data.audios?.[0] ?? data.audio;
      if (audioB64) {
        const audio = new Audio(`data:audio/wav;base64,${audioB64}`);
        audioRef.current = audio;
        audio.play();
        audio.onended = () => setPlaying(false);
      } else {
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  }

  function pick(option: string) {
    if (selected) return;
    setSelected(option);
    if (option === current.translation) {
      setCorrect((c) => c + 1);
    }
    setTimeout(() => {
      setIdx((i) => i + 1);
    }, 1200);
  }

  return (
    <Box display="flex" direction="column" gap={6} align="center">
      <Box display="flex" align="center" gap={3}>
        <Text variant="label-sm" tone="tertiary">
          {idx + 1} / {seeds.length}
        </Text>
        <Box grow rounded="full" bg="tertiary" overflow="hidden" h={2} style={{ minWidth: 160 }}>
          <div
            style={{
              height: "100%",
              width: `${((idx + 1) / seeds.length) * 100}%`,
              borderRadius: 9999,
              background: GAME_GRADIENTS.infoSoft,
              transition: "width 0.3s ease",
            }}
          />
        </Box>
      </Box>

      <Box
        p={8}
        rounded="lg"
        borderColor="primary"
        bg="surface-secondary"
        display="flex"
        direction="column"
        align="center"
        gap={6}
        style={{ minWidth: 320, maxWidth: 480, width: "100%" }}
      >
        <Text variant="label-md" tone="secondary">Listen and pick the correct meaning</Text>

        <Button
          variant="secondary"
          size="lg"
          icon="volume-high"
          onClick={playAudio}
          disabled={playing}
        >
          {playing ? "Playing..." : "Play word"}
        </Button>

        <Box display="flex" direction="column" gap={3} style={{ width: "100%" }}>
          {options.map((opt) => {
            const isCorrectAnswer = opt === current.translation;
            const isSelected = selected === opt;
            let bgStyle: string | undefined;
            let borderStyle = "1.5px solid var(--tatva-border-primary, rgba(255,255,255,0.12))";
            if (selected) {
              if (isCorrectAnswer) {
                bgStyle = GAME_COLORS.success;
                borderStyle = `1.5px solid ${GAME_COLORS.success}`;
              } else if (isSelected) {
                bgStyle = GAME_COLORS.danger;
                borderStyle = `1.5px solid ${GAME_COLORS.danger}`;
              }
            }
            return (
              <motion.div
                key={opt}
                whileHover={!selected ? { scale: 1.02 } : undefined}
                whileTap={!selected ? { scale: 0.98 } : undefined}
                style={{
                  cursor: selected ? "default" : "pointer",
                  borderRadius: 14,
                  background: bgStyle ?? "var(--tatva-surface-primary, rgba(255,255,255,0.06))",
                  border: borderStyle,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "background 0.2s, border 0.2s",
                }}
                onClick={() => pick(opt)}
              >
                {selected && isCorrectAnswer && <Icon name="check" size="sm" tone="inverse" />}
                {selected && isSelected && !isCorrectAnswer && <Icon name="close" size="sm" tone="inverse" />}
                <Text
                  variant="body-md"
                  tone={bgStyle ? "inverse" : undefined}
                  style={{ fontWeight: 500 }}
                >
                  {opt}
                </Text>
              </motion.div>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

// --- Speak Lesson ---
function SpeakRunner({
  seeds,
  language,
  onComplete,
}: {
  seeds: VocabSeed[];
  language: string;
  onComplete: (avgScore: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const completedRef = useRef(false);
  const current = seeds[idx];
  const done = idx >= seeds.length;

  useEffect(() => {
    if (done && scores.length > 0 && !completedRef.current) {
      completedRef.current = true;
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      onComplete(avg);
    }
  }, [done, scores, onComplete]);

  if (done) return null;

  async function playPhrase() {
    setPlaying(true);
    try {
      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: current.word,
          target_language_code: `${language}-IN`,
        }),
      });
      if (!res.ok) throw new Error(`TTS error: ${res.status}`);
      const data = await res.json();
      const audioB64 = data.audios?.[0] ?? data.audio;
      if (audioB64) {
        const audio = new Audio(`data:audio/wav;base64,${audioB64}`);
        audio.play();
        audio.onended = () => setPlaying(false);
      } else {
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processRecording(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      setTranscript("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  async function processRecording(blob: Blob) {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("language_code", `${language}-IN`);
      const res = await fetch("/api/sarvam/stt", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`STT error: ${res.status}`);
      const data = await res.json();
      const nativeText = data.transcript || data.text || "";
      setTranscript(nativeText);

      let romanized = nativeText;
      try {
        const tlRes = await fetch("/api/sarvam/transliterate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: nativeText,
            source_language_code: `${language}-IN`,
            target_language_code: "en-IN",
          }),
        });
        if (tlRes.ok) {
          const tlData = await tlRes.json();
          romanized = tlData.transliterated_text || tlData.output || romanized;
        }
      } catch {}

      const targetWords = current.word.toLowerCase().split(/\s+/);
      const spokenNative = nativeText.toLowerCase().split(/\s+/);
      const spokenRoman = romanized.toLowerCase().split(/\s+/);
      const matched = targetWords.filter((w: string) =>
        spokenNative.some((sw: string) => sw.includes(w) || w.includes(sw)) ||
        spokenRoman.some((sw: string) => sw.includes(w) || w.includes(sw))
      ).length;
      const s = targetWords.length > 0 ? Math.round((matched / targetWords.length) * 100) : 0;
      setScore(s);
      setScores((prev) => [...prev, s]);
    } catch {
      setTranscript("Could not process audio");
      setScore(0);
      setScores((prev) => [...prev, 0]);
    }
    setProcessing(false);
  }

  function next() {
    setTranscript("");
    setScore(null);
    setIdx((i) => i + 1);
  }

  return (
    <Box display="flex" direction="column" gap={6} align="center">
      <Box display="flex" align="center" gap={3}>
        <Text variant="label-sm" tone="tertiary">
          {idx + 1} / {seeds.length}
        </Text>
        <Box grow rounded="full" bg="tertiary" overflow="hidden" h={2} style={{ minWidth: 160 }}>
          <div
            style={{
              height: "100%",
              width: `${((idx + 1) / seeds.length) * 100}%`,
              borderRadius: 9999,
              background: GAME_GRADIENTS.speakSoft,
              transition: "width 0.3s ease",
            }}
          />
        </Box>
      </Box>

      <Box
        p={8}
        rounded="lg"
        borderColor="primary"
        bg="surface-secondary"
        display="flex"
        direction="column"
        align="center"
        gap={6}
        style={{ minWidth: 320, maxWidth: 480, width: "100%" }}
      >
        <Text variant="label-md" tone="secondary">Say this word aloud</Text>
        <Text variant="heading-lg">{current.word}</Text>
        <Text variant="body-sm" tone="secondary">{current.translation}</Text>

        <Box display="flex" gap={3} align="center">
          <HoverLift>
            <Button
              variant="secondary"
              size="md"
              icon="volume-high"
              onClick={playPhrase}
              disabled={playing}
            >
              Listen
            </Button>
          </HoverLift>

          {!recording ? (
            <HoverLift>
              <Button
                variant="primary"
                size="md"
                icon="microphone"
                onClick={startRecording}
                disabled={score !== null}
              >
                Record
              </Button>
            </HoverLift>
          ) : (
            <PulseRing color="rgba(239,68,68,0.4)">
              <Button
                variant="destructive"
                size="md"
                icon="stop"
                onClick={stopRecording}
              >
                Stop
              </Button>
            </PulseRing>
          )}
        </Box>

        {/* Waveform when recording */}
        <AnimatePresence>
          {recording && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              style={{ width: "100%" }}
            >
              <VoiceWaveform active color={GAME_COLORS.dangerAlt} barCount={28} style={{ height: 36 }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live transcript */}
        <AnimatePresence>
          {(transcript || processing) && (
            <div style={{ width: "100%" }}>
              <LiveTranscript
                text={transcript}
                isListening={processing}
                label="You said"
                style={{
                  background: "var(--tatva-background-tertiary, rgba(255,255,255,0.05))",
                }}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Score reveal */}
        <AnimatePresence>
          {score !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Box display="flex" direction="column" align="center" gap={3}>
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.1 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background:
                      score >= 70
                        ? GAME_GRADIENTS.success
                        : score >= 40
                        ? GAME_GRADIENTS.warning
                        : GAME_GRADIENTS.danger,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>{score}%</span>
                </motion.div>
                <FadeIn delay={0.2}>
                  <Text variant="body-sm" tone="secondary">
                    {score >= 70 ? "Great job!" : score >= 40 ? "Getting there!" : "Keep practicing!"}
                  </Text>
                </FadeIn>
                <HoverLift>
                  <Button variant="primary" size="md" onClick={next}>
                    {idx < seeds.length - 1 ? "Next word" : "Finish"}
                  </Button>
                </HoverLift>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}

// --- Main Page ---
export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const {
    targetLanguage,
    gardenCards,
    completeLesson,
    startLesson,
    addGardenCard,
  } = useAppStore();

  const [phase, setPhase] = useState<"intro" | "active" | "done">("intro");

  const found = targetLanguage
    ? getLessonById(targetLanguage, lessonId)
    : null;

  const startedRef = useRef(false);
  useEffect(() => {
    if (found && !startedRef.current) {
      startedRef.current = true;
      startLesson(lessonId);
    }
  }, [lessonId, found, startLesson]);

  useEffect(() => {
    if (found?.lesson.type === "scenario" && found.lesson.linkedScenarioId) {
      router.replace(`/scenario-rooms/${found.lesson.linkedScenarioId}`);
    }
  }, [found?.lesson.type, found?.lesson.linkedScenarioId, router]);

  if (!targetLanguage || !found) {
    return (
      <Box p={8} display="flex" direction="column" align="center" gap={4}>
        <Icon name="warning" size="lg" tone="warning" />
        <Text variant="heading-md">Lesson not found</Text>
        <Button variant="primary" onClick={() => router.push("/learning-path")}>
          Back to Learning Path
        </Button>
      </Box>
    );
  }

  const { unit, lesson } = found;
  const seeds = lesson.vocabSeeds ?? [];

  const handleCompleteRef = useRef((scoreOrCount: number, vocabRatings?: number[]) => {});
  handleCompleteRef.current = (scoreOrCount: number, vocabRatings?: number[]) => {
    completeLesson(lesson.id, lesson.xpReward);
    if (seeds.length > 0 && targetLanguage) {
      seeds.forEach((seed, i) => {
        const exists = gardenCards.some(
          (c) => c.word === seed.word && c.language === targetLanguage
        );
        if (!exists) {
          const card = createCard(
            seed.word,
            seed.translation,
            targetLanguage,
            seed.category,
            seed.nativeText
          );
          const rating = vocabRatings?.[i];
          if (rating && rating <= 2) {
            card.difficulty = rating === 1 ? 8 : 6;
            card.scheduledDays = rating === 1 ? 0 : 1;
          }
          addGardenCard(card);
        }
      });
    }
    setPhase("done");
    setTimeout(() => fireConfetti("sides"), 300);
  };

  const stableHandleComplete = useCallback(
    (scoreOrCount: number, vocabRatings?: number[]) => handleCompleteRef.current(scoreOrCount, vocabRatings),
    []
  );

  const TYPE_LABEL: Record<string, { icon: IconName; label: string; color: string }> = {
    vocab: { icon: "docs", label: "Vocabulary", color: GAME_COLORS.success },
    listen: { icon: "audio-book", label: "Listening", color: GAME_COLORS.info },
    speak: { icon: "microphone", label: "Speaking", color: GAME_COLORS.warningOrange },
    scenario: { icon: "chat", label: "Scenario", color: GAME_COLORS.scenario },
  };

  const typeInfo = TYPE_LABEL[lesson.type] ?? TYPE_LABEL.vocab;

  if (phase === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Header
          type="main"
          left={{ title: "Lesson Complete" }}
          onBack={() => router.push("/learning-path")}
        />
        <Box grow overflow="auto" p={8}>
          <Box display="flex" direction="column" align="center" gap={6} style={{ maxWidth: 560, margin: "0 auto" }}>
            <ScaleIn>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: GAME_GRADIENTS.success,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="check" size="lg" tone="inverse" />
              </div>
            </ScaleIn>
            <FadeIn delay={0.2}><Text variant="heading-lg">Well done!</Text></FadeIn>
            <Text variant="body-md" tone="secondary">{lesson.title}</Text>
            <Box display="flex" gap={4}>
              <Badge variant="brand">+{lesson.xpReward} XP</Badge>
              {seeds.length > 0 && (
                <Badge variant="green">+{seeds.length} garden words</Badge>
              )}
            </Box>

            {seeds.length > 0 && (
              <FadeIn delay={0.4}>
                <Box display="flex" direction="column" gap={3} style={{ width: "100%" }}>
                  <Text variant="label-md" tone="secondary">
                    Words you practiced
                  </Text>
                  <Box display="flex" direction="column" gap={2}>
                    {seeds.map((seed, i) => (
                      <RecapRow key={`${seed.word}-${i}`} seed={seed} language={targetLanguage} />
                    ))}
                  </Box>
                </Box>
              </FadeIn>
            )}

            <Box display="flex" gap={3} mt={4}>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setPhase("intro");
                  startedRef.current = false;
                }}
              >
                Practice again
              </Button>
              <Button variant="primary" size="lg" onClick={() => router.push("/learning-path")}>
                Continue Path
              </Button>
            </Box>
          </Box>
        </Box>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Header
          type="main"
          left={{ title: unit.title }}
          onBack={() => router.push("/learning-path")}
        />
        <Box grow overflow="auto" p={8}>
          <Box
            display="flex"
            direction="column"
            align="center"
            gap={5}
            style={{ maxWidth: 480, margin: "32px auto 0" }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: `${typeInfo.color}20`,
                border: `2px solid ${typeInfo.color}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={typeInfo.icon} size="lg" tone="brand" />
            </div>
            <Text variant="heading-lg">{lesson.title}</Text>
            <Text
              variant="body-md"
              tone="secondary"
              style={{ textAlign: "center" }}
            >
              {lesson.description}
            </Text>
            <Box display="flex" gap={3}>
              <Badge variant="brand">{typeInfo.label}</Badge>
              <Badge variant="default">{lesson.durationMin} min</Badge>
              <Badge variant="green">+{lesson.xpReward} XP</Badge>
            </Box>
            {seeds.length > 0 && (
              <Text variant="body-xs" tone="tertiary">
                {seeds.length} words to practice
              </Text>
            )}
            <Box mt={4}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setPhase("active")}
              >
                Start Lesson
              </Button>
            </Box>
          </Box>
        </Box>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header
        type="main"
        left={{ title: lesson.title }}
        onBack={() => router.push("/learning-path")}
      />
      <Box grow overflow="auto" p={6}>
        {lesson.type === "vocab" && seeds.length > 0 && (
          <VocabRunner
            seeds={seeds}
            language={targetLanguage}
            onComplete={stableHandleComplete}
          />
        )}
        {lesson.type === "listen" && seeds.length > 0 && (
          <ListenRunner
            seeds={seeds}
            language={targetLanguage}
            onComplete={stableHandleComplete}
          />
        )}
        {lesson.type === "speak" && seeds.length > 0 && (
          <SpeakRunner
            seeds={seeds}
            language={targetLanguage}
            onComplete={stableHandleComplete}
          />
        )}
        {seeds.length === 0 && (
          <Box display="flex" direction="column" align="center" gap={4} p={8}>
            <Text variant="body-md" tone="secondary">
              This lesson has no practice content yet.
            </Text>
            <Button variant="primary" onClick={() => stableHandleComplete(0)}>
              Complete & Continue
            </Button>
          </Box>
        )}
      </Box>
    </div>
  );
}
