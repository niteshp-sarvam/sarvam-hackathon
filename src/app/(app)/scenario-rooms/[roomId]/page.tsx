"use client";

import { use, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Header,
  Text,
  Badge,
  Icon,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import {
  SCENARIO_ROOMS,
  SUPPORTED_LANGUAGES,
  SESSION_DIFFICULTIES,
  type SessionDifficulty,
} from "@/lib/constants";
import { getCurriculum } from "@/lib/curriculum";
import { buildSystemPrompt, type ScenarioRoomLike } from "@/lib/scenario-prompt";
import {
  judgeScenario,
  type JudgeResult,
  type JudgeStruggleWord,
} from "@/lib/scenario-judge";
import { isEnglishLeaning } from "@/lib/english-detector";
import { createCard } from "@/lib/fsrs";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  HoverLift,
  TranscriptPanel,
  parseSuggestions,
  stripSuggestions,
  AnimatePresence,
  motion,
  fireConfetti,
} from "@/components/motion";
import MeshSphere from "@/components/MeshSphere";
import { Micdrop } from "@micdrop/client";
import { useMicdropState, useMicdropError, useSpeakerVolume, useMicVolume } from "@micdrop/react";

// Strips every control marker we use from a raw assistant content string,
// EXCEPT [SUGGEST:...] which is parsed separately by parseSuggestions.
const CONTROL_MARKERS_RE =
  /\[(?:SCENARIO_COMPLETE|STARS:\d|SUBGOAL:\d+|SCENE:[^\]]*)\]/g;

const FORMALITY_BASE_TEMP: Record<string, number> = {
  formal: 0.55,
  polite: 0.7,
  casual: 0.85,
};

const DIFFICULTY_TEMP_DELTA: Record<SessionDifficulty, number> = {
  easy: -0.1,
  normal: 0,
  hard: 0.05,
};

/** Sarvam hybrid reasoning consumes max_tokens before streaming assistant `content`; keep headroom. */
const DIFFICULTY_MAX_TOKENS: Record<SessionDifficulty, number> = {
  easy: 1024,
  normal: 1536,
  hard: 2048,
};

// Module-level helper so React's purity rule isn't tripped by Math.random()
// being read inside the component body.
function randomSessionSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

export default function ScenarioRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const {
    targetLanguage,
    nativeLanguage,
    addScenarioResult,
    gardenCards,
    addGardenCard,
    addXp,
    addActivity,
    completeLesson,
  } = useAppStore();
  const { resolvedMode } = useTheme();

  const room = SCENARIO_ROOMS.find((r) => r.id === roomId);
  // Scenarios are language-agnostic — the conversation runs in whichever
  // language the user is currently learning (their `targetLanguage` from settings).
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);

  const [isComplete, setIsComplete] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [isJudging, setIsJudging] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [difficulty, setDifficulty] = useState<SessionDifficulty>("normal");
  const [sessionSeed, setSessionSeed] = useState<number>(() => randomSessionSeed());
  const [connectionError, setConnectionError] = useState<false | "connection" | "mic">(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [transcriptCopied, setTranscriptCopied] = useState(false);
  const [plantedWords, setPlantedWords] = useState<
    { phrase: string; meaning: string; isNew: boolean }[]
  >([]);

  const micdropState = useMicdropState();
  useMicdropError((err) => {
    const e = err as { name?: string; message?: string; code?: string };
    const text = [e.name, e.message, e.code].filter(Boolean).join(" ").trim();
    if (!micdropErrorHandledRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Micdrop]", e.code || text || "error", err);
      } else {
        console.error("[Micdrop]", e.code || text || "error");
      }
    }
    if (micdropErrorHandledRef.current) return;
    const isMic =
      e.code === "NotAllowed" || /Permission|NotAllowed|NotFoundError|device/i.test(text);
    const isConnection =
      e.code === "Connection" ||
      /Connection|ECONNREFUSED|WebSocket|refused|closed|network/i.test(text);
    if (isMic) {
      micdropErrorHandledRef.current = true;
      setConnectionError("mic");
      voiceStartedRef.current = false;
      void Micdrop.stop().catch(() => {});
    } else if (isConnection) {
      micdropErrorHandledRef.current = true;
      setConnectionError("connection");
      voiceStartedRef.current = false;
      void Micdrop.stop().catch(() => {});
    }
  });
  const { speakerVolume, maxSpeakerVolume } = useSpeakerVolume();
  const { micVolume, maxMicVolume } = useMicVolume();

  const normalizedSpeaker = maxSpeakerVolume > 0 ? speakerVolume / maxSpeakerVolume : 0;
  const normalizedMic = maxMicVolume > 0 ? micVolume / maxMicVolume : 0;

  const VOICE_SERVER_URL = process.env.NEXT_PUBLIC_VOICE_SERVER_URL ?? "ws://localhost:8081";

  const voiceConversation = useMemo(
    () => micdropState.conversation ?? [],
    [micdropState.conversation]
  );
  const voiceTurnCount = voiceConversation.filter((m) => m.role === "user").length;
  const subGoalsHit = useMemo(() => {
    let highest = 0;
    for (const msg of voiceConversation) {
      if (msg.role !== "assistant") continue;
      const content = "content" in msg ? (msg.content ?? "") : "";
      const matches = content.matchAll(/\[SUBGOAL:(\d+)\]/g);
      for (const m of matches) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > highest) highest = n;
      }
    }
    if (room && highest > room.subGoals.length) highest = room.subGoals.length;
    return highest;
  }, [voiceConversation, room]);

  const voiceStartedRef = useRef(false);
  const startingRef = useRef(false);
  const judgingFiredRef = useRef(false);
  const replayAudioRef = useRef<HTMLAudioElement | null>(null);
  /** One Micdrop error per session — avoids console spam on WS retry loops. */
  const micdropErrorHandledRef = useRef(false);

  const plantStruggleWords = useCallback(
    (words: JudgeStruggleWord[]) => {
      if (!targetLanguage || words.length === 0) return [];

      const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
      const existing = new Set(
        gardenCards.map((card) => `${card.language}:${normalize(card.word).toLowerCase()}`)
      );
      const seenBatch = new Set<string>();
      const planted: { phrase: string; meaning: string; isNew: boolean }[] = [];

      for (const word of words) {
        const phrase = normalize(word.phrase ?? "");
        if (!phrase) continue;

        const meaning = normalize(word.meaning ?? "") || "Scenario phrase to review";
        const key = `${targetLanguage}:${phrase.toLowerCase()}`;
        if (seenBatch.has(key)) continue;
        seenBatch.add(key);

        if (!existing.has(key)) {
          addGardenCard(createCard(phrase, meaning, targetLanguage, "vocabulary"));
          existing.add(key);
          planted.push({ phrase, meaning, isNew: true });
        } else {
          planted.push({ phrase, meaning, isNew: false });
        }
      }

      return planted;
    },
    [targetLanguage, gardenCards, addGardenCard]
  );

  const sessionTemperature = useMemo(() => {
    if (!room) return 0.7;
    const base = FORMALITY_BASE_TEMP[room.promptConfig.formality] ?? 0.7;
    const delta = DIFFICULTY_TEMP_DELTA[difficulty];
    return Math.max(0.4, Math.min(1.0, base + delta));
  }, [room, difficulty]);

  const sessionMaxTokens = DIFFICULTY_MAX_TOKENS[difficulty];

  const immersiveThemeStyle = useMemo(() => {
    if (resolvedMode === "light") {
      return {
        ["--tatva-content-primary" as string]: "rgba(15,23,42,0.94)",
        ["--tatva-content-secondary" as string]: "rgba(30,41,59,0.82)",
        ["--tatva-content-tertiary" as string]: "rgba(51,65,85,0.62)",
        ["--tatva-content-inverse" as string]: "#ffffff",
        ["--tatva-surface-secondary" as string]: "rgba(255,255,255,0.72)",
        ["--tatva-background-primary" as string]: "rgba(255,255,255,0.9)",
        ["--tatva-border-primary" as string]: "rgba(15,23,42,0.16)",
        ["--tatva-border-secondary" as string]: "rgba(15,23,42,0.1)",
        background:
          "radial-gradient(circle at 50% 12%, rgba(88,204,2,0.14), transparent 30%), linear-gradient(180deg, #f8fbff 0%, #edf3fb 100%)",
      };
    }

    return {
      ["--tatva-content-primary" as string]: "rgba(255,255,255,0.94)",
      ["--tatva-content-secondary" as string]: "rgba(255,255,255,0.8)",
      ["--tatva-content-tertiary" as string]: "rgba(255,255,255,0.62)",
      ["--tatva-content-inverse" as string]: "#ffffff",
      ["--tatva-surface-secondary" as string]: "rgba(255,255,255,0.06)",
      ["--tatva-background-primary" as string]: "rgba(255,255,255,0.08)",
      ["--tatva-border-primary" as string]: "rgba(255,255,255,0.22)",
      ["--tatva-border-secondary" as string]: "rgba(255,255,255,0.14)",
      background:
        "radial-gradient(circle at 50% 12%, rgba(88,204,2,0.08), transparent 28%), linear-gradient(180deg, #0d0f14 0%, #141922 100%)",
    };
  }, [resolvedMode]);

  const startVoiceSession = useCallback(async () => {
    if (!room || !lang) return;
    setConnectionError(false);
    micdropErrorHandledRef.current = false;
    judgingFiredRef.current = false;
    const systemPrompt = buildSystemPrompt({
      room: room as ScenarioRoomLike,
      lang,
      difficulty,
      sessionSeed,
      disableSceneMarkers: true,
    });

    const wsUrl = new URL(VOICE_SERVER_URL);
    wsUrl.searchParams.set("roomId", room.id);
    wsUrl.searchParams.set("lang", `${lang.code}-IN`);
    wsUrl.searchParams.set("systemPrompt", systemPrompt);
    wsUrl.searchParams.set("temperature", sessionTemperature.toFixed(2));
    wsUrl.searchParams.set("maxTokens", String(sessionMaxTokens));
    if (room.objective.kind === "max_total_price") {
      wsUrl.searchParams.set("firstTurnMinQuote", String(room.objective.openingQuoteRange[0]));
      wsUrl.searchParams.set("targetMax", String(room.objective.targetMax));
    }

    try {
      await Micdrop.stop().catch(() => {});
      await new Promise((r) => setTimeout(r, 300));
      await Micdrop.start({
        url: wsUrl.toString(),
        vad: ["volume"],
      });
    } catch (err) {
      console.error("[VoiceSession] Failed to start:", err);
      micdropErrorHandledRef.current = true;
      const msg = String(err);
      const isMicError =
        msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("Mic");
      setConnectionError(isMicError ? "mic" : "connection");
    }
  }, [room, lang, difficulty, sessionSeed, sessionTemperature, sessionMaxTokens, VOICE_SERVER_URL]);

  const stopVoiceSession = useCallback(async () => {
    await Micdrop.stop().catch(() => {});
    voiceStartedRef.current = false;
  }, []);

  // When the user manually taps "End", fire the judge even though the agent
  // may not have emitted [SCENARIO_COMPLETE]. This prevents the "no stars" bug.
  const handleEndConversation = useCallback(() => {
    if (isComplete || judgingFiredRef.current) return;
    judgingFiredRef.current = true;
    setIsComplete(true);
    setIsJudging(true);
    stopVoiceSession();

    const transcriptForJudge = voiceConversation
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: "content" in m ? (m.content ?? "") : "",
      }))
      .filter((m) => m.content.trim().length > 0);

    if (!room || !lang || !targetLanguage) {
      setIsJudging(false);
      return;
    }

    judgeScenario({
      room: room as ScenarioRoomLike,
      targetLanguageCode: lang.code,
      targetLanguageName: lang.name,
      nativeLanguageName:
        nativeLanguage === "en"
          ? "English"
          : SUPPORTED_LANGUAGES.find((l) => l.code === nativeLanguage)?.name ?? "English",
      subGoalsHit,
      transcript: transcriptForJudge,
    })
      .then((result) => {
        const planted = plantStruggleWords(result.struggleWords);
        setPlantedWords(planted);
        setJudgeResult(result);
        setIsJudging(false);

        if (result.stars >= 1) {
          setTimeout(() => fireConfetti(result.stars >= 2 ? "sides" : "center"), 300);

          const userUtterances = transcriptForJudge
            .filter((m) => m.role === "user")
            .map((m) => m.content.replace(CONTROL_MARKERS_RE, "").trim())
            .filter((t) => t.length > 0);
          let engCount = 0;
          for (const u of userUtterances) if (isEnglishLeaning(u)) engCount++;

          addScenarioResult({
            roomId: room.id,
            stars: result.stars,
            completedAt: new Date().toISOString(),
            vocabUsed: voiceTurnCount,
            engFallbackCount: engCount,
          });
          addActivity({
            type: "scenario_completed",
            id: room.id,
            meta: { stars: result.stars, turns: voiceTurnCount, difficulty },
          });

          let linkedLessonFound = false;
          const curriculum = getCurriculum(targetLanguage);
          for (const unit of curriculum) {
            for (const lesson of unit.lessons) {
              if (lesson.linkedScenarioId === room.id) {
                completeLesson(lesson.id, lesson.xpReward);
                linkedLessonFound = true;
              }
            }
          }
          if (!linkedLessonFound) addXp(result.stars * 50);
        }
      })
      .catch((err) => {
        console.error("[ScenarioRoom] judge failed:", err);
        setIsJudging(false);
      });
  }, [isComplete, stopVoiceSession, voiceConversation, room, lang, targetLanguage, nativeLanguage, subGoalsHit, voiceTurnCount, difficulty, addScenarioResult, addActivity, addXp, completeLesson, plantStruggleWords]);

  const retryConnection = useCallback(() => {
    setConnectionError(false);
    micdropErrorHandledRef.current = false;
    setIsMicMuted(false);
    voiceStartedRef.current = false;
    setRestartKey((k) => k + 1);
  }, []);

  const fullRestart = useCallback(
    (nextDifficulty?: SessionDifficulty) => {
      if (replayAudioRef.current) {
        replayAudioRef.current.pause();
        replayAudioRef.current = null;
      }
      stopVoiceSession();
      setIsComplete(false);
      setJudgeResult(null);
      setIsJudging(false);
      setTranscriptCopied(false);
      setIsMicMuted(false);
      micdropErrorHandledRef.current = false;
      setPlantedWords([]);
      setSessionSeed(randomSessionSeed());
      if (nextDifficulty) setDifficulty(nextDifficulty);
      voiceStartedRef.current = false;
      judgingFiredRef.current = false;
      setRestartKey((k) => k + 1);
    },
    [stopVoiceSession]
  );

  useEffect(() => {
    if (!room) return;
    if (!voiceStartedRef.current && !startingRef.current) {
      voiceStartedRef.current = true;
      startingRef.current = true;
      startVoiceSession().finally(() => {
        startingRef.current = false;
      });
    }
    return () => {
      Micdrop.stop().catch(() => {});
      voiceStartedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, restartKey]);

  const lastAssistantMsg = [...voiceConversation].reverse().find((m) => m.role === "assistant");
  const lastAssistantContent =
    lastAssistantMsg && "content" in lastAssistantMsg
      ? (lastAssistantMsg.content ?? "")
      : "";

  // Strip ALL markers (incl. SUGGEST) from text used for replay/copy.
  const lastAssistantSpeakable = useMemo(() => {
    return stripSuggestions(lastAssistantContent.replace(CONTROL_MARKERS_RE, "")).trim();
  }, [lastAssistantContent]);

  const [transcriptMessages, setTranscriptMessages] = useState<
    {
      role: "user" | "assistant";
      content: string;
      suggestions?: { phrase: string; meaning: string }[];
      uid: number;
    }[]
  >([]);
  const messageUidRef = useRef(0);

  // Build transcript bubbles from the live voice conversation, stripping all
  // control markers from displayed text.
  useEffect(() => {
    const incoming = voiceConversation
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((msg) => {
        const rawContent = "content" in msg ? (msg.content ?? "") : "";
        const cleaned = rawContent.replace(CONTROL_MARKERS_RE, "");
        const content = stripSuggestions(cleaned).trim();
        const suggestions =
          msg.role === "assistant" ? parseSuggestions(cleaned) : undefined;
        return {
          role: msg.role as "user" | "assistant",
          content,
          suggestions,
        };
      })
      .filter((m) => m.content.length > 0);

    if (incoming.length === 0) return;

    setTranscriptMessages((prev) => {
      const indexByKey = new Map<string, number>();
      prev.forEach((m, i) => indexByKey.set(`${m.role}|${m.content}`, i));
      let next = prev;
      let mutated = false;
      for (const cur of incoming) {
        const key = `${cur.role}|${cur.content}`;
        const existingIdx = indexByKey.get(key);
        if (existingIdx === undefined) {
          if (!mutated) next = [...next];
          next.push({
            role: cur.role,
            content: cur.content,
            suggestions: cur.suggestions,
            uid: ++messageUidRef.current,
          });
          indexByKey.set(key, next.length - 1);
          mutated = true;
        } else {
          const existing = next[existingIdx];
          const incomingHasMore =
            (cur.suggestions?.length ?? 0) > (existing.suggestions?.length ?? 0);
          if (incomingHasMore) {
            if (!mutated) next = [...next];
            next[existingIdx] = { ...existing, suggestions: cur.suggestions };
            mutated = true;
          }
        }
      }
      return mutated ? next : prev;
    });
  }, [voiceConversation]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranscriptMessages([]);
    messageUidRef.current = 0;
  }, [restartKey]);

  // ─── completion + judge orchestration ─────────────────────────────────
  useEffect(() => {
    if (!room || !lang || !targetLanguage) return;
    if (isComplete) return;
    if (judgingFiredRef.current) return;
    // Trigger on explicit markers — also accept [STARS:N] as a fallback
    // (some model outputs skip [SCENARIO_COMPLETE] but still emit [STARS:N]).
    const hasComplete = lastAssistantContent.includes("[SCENARIO_COMPLETE]");
    const hasStars = /\[STARS:\d\]/.test(lastAssistantContent);
    if (!hasComplete && !hasStars) return;
    queueMicrotask(() => {
      handleEndConversation();
    });
  }, [room, lang, targetLanguage, isComplete, lastAssistantContent, handleEndConversation]);

  useEffect(() => {
    return () => {
      Micdrop.stop().catch(() => {});
      if (replayAudioRef.current) {
        replayAudioRef.current.pause();
        replayAudioRef.current = null;
      }
    };
  }, []);

  // Force-resume the AudioContext if the browser suspended it. Without this,
  // agent audio chunks queue silently and the user hears nothing.
  const ensureAudioContextAlive = useCallback(async () => {
    try {
      const ctx = (window as unknown as { micdropAudioContext?: AudioContext })
        .micdropAudioContext;
      if (ctx && ctx.state !== "running") {
        await ctx.resume();
      }
    } catch (e) {
      console.warn("[AudioContext] resume failed:", e);
    }
  }, []);

  useEffect(() => {
    const onGesture = () => {
      ensureAudioContextAlive();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") ensureAudioContextAlive();
    };
    document.addEventListener("click", onGesture, { passive: true });
    document.addEventListener("touchstart", onGesture, { passive: true });
    document.addEventListener("keydown", onGesture, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("click", onGesture);
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("keydown", onGesture);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ensureAudioContextAlive]);

  const toggleMute = useCallback(async () => {
    await ensureAudioContextAlive();
    const stream = (
      window as unknown as { micdropMic?: { audioStream?: MediaStream } }
    ).micdropMic?.audioStream;
    const next = !isMicMuted;
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
    }
    setIsMicMuted(next);
  }, [isMicMuted, ensureAudioContextAlive]);

  // Re-synthesize the last assistant line via Sarvam TTS and play it.
  const replayLastLine = useCallback(async () => {
    if (!lang || !lastAssistantSpeakable) return;
    if (replayAudioRef.current) {
      replayAudioRef.current.pause();
      replayAudioRef.current = null;
    }
    setReplayLoading(true);
    try {
      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: lastAssistantSpeakable,
          target_language_code: `${lang.code}-IN`,
        }),
      });
      const data = await res.json();
      const base64: string | undefined = data?.audios?.[0];
      if (!base64) {
        console.warn("[replayLastLine] no audio returned");
        return;
      }
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      replayAudioRef.current = audio;
      audio.onended = () => {
        if (replayAudioRef.current === audio) replayAudioRef.current = null;
      };
      await audio.play();
    } catch (e) {
      console.error("[replayLastLine] failed:", e);
    } finally {
      setReplayLoading(false);
    }
  }, [lang, lastAssistantSpeakable]);

  const sphereState: "idle" | "listening" | "speaking" | "processing" =
    micdropState.isAssistantSpeaking
      ? "speaking"
      : isMicMuted
        ? "idle"
        : micdropState.isListening || micdropState.isUserSpeaking
          ? "listening"
          : micdropState.isProcessing
            ? "processing"
            : "idle";

  const characterName = useMemo(() => {
    if (!room) return "Tutor";
    const beforeWho = room.persona.split(/\bwho\b/i)[0].split(",")[0].trim();
    const words = beforeWho.split(/\s+/).filter(Boolean);
    const tail = words.slice(-2).join(" ");
    return tail.replace(/\b\w/g, (c) => c.toUpperCase()) || "Tutor";
  }, [room]);

  const nativeLanguageLabel = useMemo(() => {
    if (nativeLanguage === "en") return "English";
    return SUPPORTED_LANGUAGES.find((l) => l.code === nativeLanguage)?.name ?? "your language";
  }, [nativeLanguage]);

  function copyTranscript() {
    if (!room || !lang) return;
    const lines = transcriptMessages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => `${m.role === "user" ? "You" : characterName}: ${m.content}`);
    const header =
      `${room.title} — ${lang.name} practice\n` +
      `Difficulty: ${difficulty}\n` +
      `Goal: ${room.goal}\n` +
      `Date: ${new Date().toLocaleString()}\n` +
      `${"-".repeat(48)}\n`;
    const blob = header + lines.join("\n");
    navigator.clipboard
      .writeText(blob)
      .then(() => {
        setTranscriptCopied(true);
        setTimeout(() => setTranscriptCopied(false), 2400);
      })
      .catch((e) => console.error("copy failed:", e));
  }

  if (!room) {
    return (
      <Box p={8} display="flex" direction="column" align="center" gap={4}>
        <Text variant="heading-md">Room not found</Text>
        <Button variant="primary" onClick={() => router.push("/scenario-rooms")}>
          Back to Rooms
        </Button>
      </Box>
    );
  }

  if (!lang) {
    return (
      <Box p={8} display="flex" direction="column" align="center" gap={4}>
        <Text variant="heading-md">Pick a language to learn</Text>
        <Text variant="body-sm" tone="secondary" style={{ textAlign: "center", maxWidth: 380 }}>
          You haven&apos;t set a target language yet. Choose one in Settings and
          come back — every scenario will run in that language.
        </Text>
        <Box display="flex" gap={2}>
          <Button variant="primary" onClick={() => router.push("/settings")}>
            Open Settings
          </Button>
          <Button variant="outline" onClick={() => router.push("/scenario-rooms")}>
            Back to Rooms
          </Button>
        </Box>
      </Box>
    );
  }

  const isLiveSession = !connectionError && !isComplete;

  return (
    <Box display="flex" direction="column" h="full">
      {!isLiveSession && (
        <Header
          type="main"
          left={{
            title: room.title,
          }}
          onBack={() => router.push("/scenario-rooms")}
        />
      )}

      <Box display="flex" direction="column" grow overflow="hidden">
        {/* Error state */}
        {connectionError && !isComplete && (
          <Box grow display="flex" direction="column" align="center" justify="center" gap={6} p={8}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background:
                  connectionError === "mic"
                    ? "linear-gradient(135deg, #FF4B4B, #E53E3E)"
                    : "linear-gradient(135deg, #FFC200, #F49000)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {connectionError === "mic"
                ? <Icon name="volume-mute" size="lg" tone="inverse" />
                : <Icon name="warning" size="lg" tone="inverse" />
              }
            </motion.div>
            <FadeIn delay={0.2}>
              <Text variant="heading-sm">
                {connectionError === "mic"
                  ? "Microphone access denied"
                  : "Could not connect to voice server"}
              </Text>
            </FadeIn>
            <FadeIn delay={0.3}>
              <Text
                variant="body-sm"
                tone="secondary"
                style={{ textAlign: "center", maxWidth: 400 }}
              >
                {connectionError === "mic"
                  ? "This scenario needs your microphone. Click the lock icon in your browser's address bar, allow microphone access, then retry."
                  : "The voice WebSocket could not open. In development, run npm run voice in a separate terminal (default ws://localhost:8081) and set NEXT_PUBLIC_VOICE_SERVER_URL if you use another host or port, then tap Retry."}
              </Text>
            </FadeIn>
            <FadeIn delay={0.4}>
              <Box display="flex" gap={3}>
                <Button variant="primary" onClick={retryConnection}>
                  Retry
                </Button>
                <Button variant="outline" onClick={() => router.push("/scenario-rooms")}>
                  Back to Rooms
                </Button>
              </Box>
            </FadeIn>
          </Box>
        )}

        {/* Voice conversation — immersive layout */}
        {isLiveSession && (
          <div
            style={{
              ...immersiveThemeStyle,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <Box
              display="flex"
              align="center"
              justify="between"
              px={8}
              pt={6}
              pb={4}
              shrink
            >
              <button
                type="button"
                onClick={() => router.push("/scenario-rooms")}
                title="Back to rooms"
                style={pillButton({ active: false })}
              >
                <span aria-hidden="true">←</span>
                <span>Back</span>
              </button>
              <Text variant="heading-xs">
                {room.title}
              </Text>
              <span style={{ width: 68 }} />
            </Box>

            {/* Top row: info-left · sphere-center · sub-goal-checklist-right */}
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                justifyContent: "space-between",
                gap: 16,
                padding: "10px 20px 6px",
                flexShrink: 0,
              }}
            >
              {/* Left column — language + turn + difficulty + controls */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Badge variant="default">
                  {lang.name} · {lang.nativeName}
                </Badge>

                {/* Difficulty toggle */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0,
                    padding: 2,
                    borderRadius: 999,
                    background: "var(--tatva-surface-secondary, rgba(255,255,255,0.06))",
                    border: "1px solid var(--tatva-border-secondary, rgba(255,255,255,0.14))",
                  }}
                  role="radiogroup"
                  aria-label="Difficulty"
                >
                  {SESSION_DIFFICULTIES.map((d) => {
                    const active = d === difficulty;
                    return (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          if (d === difficulty) return;
                          fullRestart(d);
                        }}
                        title={`Switch to ${d} (restarts session)`}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "none",
                          textTransform: "capitalize",
                          background: active
                            ? "linear-gradient(135deg, rgba(88,204,2,0.95), rgba(60,170,0,0.95))"
                            : "transparent",
                          color: active
                            ? "var(--tatva-content-inverse, #fff)"
                            : "var(--tatva-content-secondary, rgba(255,255,255,0.8))",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      color: "var(--tatva-content-secondary, rgba(255,255,255,0.8))",
                      fontWeight: 500,
                    }}
                  >
                    Turn {voiceTurnCount}
                  </span>
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-pressed={isMicMuted}
                    title={isMicMuted ? "Unmute mic" : "Mute mic"}
                    style={pillButton({
                      active: isMicMuted,
                      activeBg: "rgba(255,200,0,0.18)",
                      activeBorder: "rgba(255,200,0,0.55)",
                      activeColor: "rgba(255,220,120,0.95)",
                    })}
                  >
                    <Icon name={isMicMuted ? "volume-mute" : "microphone"} size="sm" tone="secondary" />
                    <span>{isMicMuted ? "Muted" : "Mute"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={replayLastLine}
                    disabled={!lastAssistantSpeakable || replayLoading}
                    title="Replay last line from the character"
                    style={pillButton({
                      active: false,
                      disabled: !lastAssistantSpeakable || replayLoading,
                    })}
                  >
                    <Icon name="refresh" size="sm" tone="secondary" />
                    <span>{replayLoading ? "Loading…" : "Replay last"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEndConversation}
                    title="End conversation"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 999,
                      minHeight: 28,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "1px solid var(--tatva-danger-content, rgba(255,120,120,0.85))",
                      background: "linear-gradient(135deg, rgba(255,90,90,0.22), rgba(230,65,65,0.26))",
                      color: "var(--tatva-content-inverse, #fff)",
                      boxShadow: "0 1px 8px rgba(255,90,90,0.2)",
                      transition: "background 0.15s, transform 0.12s",
                    }}
                  >
                    <span aria-hidden="true">■</span>
                    <span>End session</span>
                  </button>
                </div>
              </div>

              {/* Center column — sphere + state badge */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="sphere-container"
                  data-state={sphereState}
                >
                  <MeshSphere
                    state={sphereState}
                    speakerVolume={normalizedSpeaker}
                    micVolume={normalizedMic}
                    size={220}
                  />
                </motion.div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={sphereState}
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 3 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {sphereState === "listening" && <Badge variant="red">Listening</Badge>}
                    {sphereState === "speaking" && (
                      <Badge variant="green">{characterName} speaking</Badge>
                    )}
                    {sphereState === "processing" && <Badge variant="yellow">Thinking...</Badge>}
                    {sphereState === "idle" && isMicMuted && (
                      <Badge variant="yellow">Muted</Badge>
                    )}
                    {sphereState === "idle" &&
                      !isMicMuted &&
                      micdropState.isStarting && <Badge variant="default">Connecting...</Badge>}
                    {sphereState === "idle" &&
                      !isMicMuted &&
                      !micdropState.isStarting && <Badge variant="default">Ready</Badge>}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right column — Goal + sub-goal checklist */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 6,
                  flex: 1,
                  minWidth: 0,
                  textAlign: "right",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: "var(--tatva-content-secondary, rgba(255,255,255,0.8))",
                  }}
                >
                  Goal
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    color: "var(--tatva-content-primary, rgba(255,255,255,0.94))",
                    lineHeight: 1.4,
                    fontStyle: "italic",
                    maxWidth: 240,
                  }}
                >
                  {room.goal}
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    width: "100%",
                    maxWidth: 260,
                    marginTop: 4,
                  }}
                >
                  {room.subGoals.map((sg, idx) => {
                    const idxOneBased = idx + 1;
                    const done = idxOneBased <= subGoalsHit;
                    return (
                      <motion.div
                        key={`${room.id}-sg-${idx}`}
                        initial={false}
                        animate={{
                          opacity: done ? 1 : 0.55,
                        }}
                        transition={{ duration: 0.25 }}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 6,
                          justifyContent: "flex-end",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11.5,
                            color: done
                              ? "var(--tatva-content-primary, rgba(255,255,255,0.94))"
                              : "var(--tatva-content-secondary, rgba(255,255,255,0.8))",
                            lineHeight: 1.35,
                            textDecorationLine: done ? "line-through" : "none",
                            textDecorationStyle: "solid" as const,
                            textDecorationColor: "var(--tatva-border-secondary, rgba(255,255,255,0.4))",
                            flex: 1,
                          }}
                        >
                          {sg}
                        </span>
                        <motion.span
                          initial={false}
                          animate={{
                            scale: done ? 1 : 0.85,
                            backgroundColor: done
                              ? "rgba(88,204,2,0.95)"
                              : "var(--tatva-background-primary, rgba(255,255,255,0.08))",
                            borderColor: done
                              ? "rgba(88,204,2,1)"
                              : "var(--tatva-border-primary, rgba(255,255,255,0.22))",
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 20,
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            border: "1px solid",
                            color: "var(--tatva-content-inverse, #fff)",
                            fontSize: 10.5,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {done ? "✓" : ""}
                        </motion.span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Transcript panel — dominant area */}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <TranscriptPanel
                messages={transcriptMessages}
                isAssistantSpeaking={micdropState.isAssistantSpeaking}
                userLabel="You"
                agentLabel={characterName}
                targetLanguageCode={lang.code}
                nativeLanguageCode={nativeLanguage}
                targetLanguageLabel={lang.name}
                nativeLanguageLabel={nativeLanguageLabel}
                scenarioContext={`${room.persona} — ${room.setting}`}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        )}

        {/* Completion panel */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{ flex: 1, display: "flex", overflowY: "auto" }}
          >
            <Box
              p={6}
              grow
              display="flex"
              direction="column"
              align="center"
              justify="center"
              gap={6}
            >
              {isJudging && (
                <Box display="flex" direction="column" align="center" gap={4}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "3px solid var(--tatva-border-secondary, rgba(255,255,255,0.14))",
                      borderTopColor: "rgba(88,204,2,0.9)",
                    }}
                  />
                  <Text variant="heading-sm">Scoring your scenario…</Text>
                  <Text variant="body-sm" tone="secondary">
                    Looking at goal completion, language consistency, and vocabulary.
                  </Text>
                </Box>
              )}

              {!isJudging && judgeResult && judgeResult.stars === 0 && (
                <CompletionTryAgain
                  reasons={judgeResult.reasons}
                  plantedWords={plantedWords}
                  onOpenGarden={() => router.push("/garden")}
                  onReplay={() => fullRestart()}
                  onBack={() => router.push("/scenario-rooms")}
                />
              )}

              {!isJudging && judgeResult && judgeResult.stars >= 1 && (
                <CompletionSuccess
                  result={judgeResult}
                  difficulty={difficulty}
                  plantedWords={plantedWords}
                  onOpenGarden={() => router.push("/garden")}
                  onReplay={() => fullRestart()}
                  onBack={() => router.push("/scenario-rooms")}
                  onCopyTranscript={copyTranscript}
                  transcriptCopied={transcriptCopied}
                />
              )}

              {!isJudging && !judgeResult && (
                <Box display="flex" direction="column" align="center" gap={4}>
                  <Text variant="heading-sm">Could not score this scenario</Text>
                  <Text variant="body-sm" tone="secondary">
                    Something went wrong scoring the conversation. You can replay and try again.
                  </Text>
                  <Box display="flex" gap={3}>
                    <Button variant="outline" onClick={() => router.push("/scenario-rooms")}>
                      Back to Rooms
                    </Button>
                    <Button variant="primary" onClick={() => fullRestart()}>
                      Replay
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </motion.div>
        )}
      </Box>
    </Box>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────

interface PillButtonProps {
  active: boolean;
  disabled?: boolean;
  activeBg?: string;
  activeBorder?: string;
  activeColor?: string;
}

function pillButton({
  active,
  disabled,
  activeBg,
  activeBorder,
  activeColor,
}: PillButtonProps): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    border: active
      ? `1px solid ${activeBorder ?? "var(--tatva-border-primary, rgba(255,255,255,0.22))"}`
      : "1px solid var(--tatva-border-secondary, rgba(255,255,255,0.14))",
    background: active
      ? activeBg ?? "var(--tatva-background-primary, rgba(255,255,255,0.08))"
      : "var(--tatva-surface-secondary, rgba(255,255,255,0.06))",
    color: active
      ? activeColor ?? "var(--tatva-content-primary, rgba(255,255,255,0.94))"
      : "var(--tatva-content-secondary, rgba(255,255,255,0.8))",
    opacity: disabled ? 0.5 : 1,
    transition: "background 0.15s, border-color 0.15s",
  };
}

// ─── completion sub-views ────────────────────────────────────────────────

type IconName = Parameters<typeof Icon>[0]["name"];

interface BadgeRowProps {
  label: string;
  earned: boolean;
  reason: string;
  delay: number;
  iconName: IconName;
}

function BadgeRow({ label, earned, reason, delay, iconName }: BadgeRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 350, damping: 25 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        background: earned
          ? "rgba(88,204,2,0.08)"
          : "var(--tatva-surface-secondary, rgba(255,255,255,0.06))",
        border: earned
          ? "1px solid rgba(88,204,2,0.3)"
          : "1px solid var(--tatva-border-secondary, rgba(255,255,255,0.14))",
        width: "100%",
        maxWidth: 480,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: earned
            ? "rgba(88,204,2,0.18)"
            : "var(--tatva-background-primary, rgba(255,255,255,0.08))",
          border: earned
            ? "1px solid rgba(88,204,2,0.5)"
            : "1px solid var(--tatva-border-primary, rgba(255,255,255,0.22))",
          opacity: earned ? 1 : 0.55,
        }}
      >
        <Icon name={iconName} size="sm" tone={earned ? "success" : "secondary"} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: earned
              ? "var(--tatva-content-primary, rgba(255,255,255,0.94))"
              : "var(--tatva-content-secondary, rgba(255,255,255,0.8))",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--tatva-content-secondary, rgba(255,255,255,0.8))",
            lineHeight: 1.4,
          }}
        >
          {reason || (earned ? "Earned" : "Not earned")}
        </span>
      </div>
      <Icon
        name={earned ? "check" : "minus"}
        size="sm"
        tone={earned ? "success" : "tertiary"}
      />
    </motion.div>
  );
}

function CompletionSuccess({
  result,
  difficulty,
  plantedWords,
  onOpenGarden,
  onReplay,
  onBack,
  onCopyTranscript,
  transcriptCopied,
}: {
  result: JudgeResult;
  difficulty: SessionDifficulty;
  plantedWords: { phrase: string; meaning: string; isNew: boolean }[];
  onOpenGarden: () => void;
  onReplay: () => void;
  onBack: () => void;
  onCopyTranscript: () => void;
  transcriptCopied: boolean;
}) {
  return (
    <>
      <Box display="flex" direction="column" align="center" gap={3}>
        <Box display="flex" gap={1} aria-label={`${result.stars} of 3 stars`}>
          {[1, 2, 3].map((s) => (
            <motion.span
              key={s}
              initial={{ opacity: 0, scale: 0, rotate: -30 }}
              animate={{
                opacity: 1,
                scale: s <= result.stars ? 1 : 0.5,
                rotate: 0,
              }}
              transition={{
                delay: s * 0.12,
                type: "spring",
                stiffness: 500,
                damping: 15,
              }}
              style={{
                fontSize: 32,
                color: s <= result.stars ? "#FFC800" : "var(--tatva-content-tertiary, rgba(255,255,255,0.38))",
              }}
            >
              ★
            </motion.span>
          ))}
        </Box>
        <FadeIn delay={0.5}>
          <Text variant="heading-sm">Scenario Complete!</Text>
        </FadeIn>
        <FadeIn delay={0.55}>
          <Text variant="body-sm" tone="secondary">
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty
          </Text>
        </FadeIn>
      </Box>

      <StaggerContainer
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
          maxWidth: 480,
        }}
      >
        <StaggerItem>
          <BadgeRow
            label="Goal"
            earned={result.badges.goal}
            reason={result.reasons.goal}
            iconName="activity"
            delay={0.05}
          />
        </StaggerItem>
        <StaggerItem>
          <BadgeRow
            label="Language"
            earned={result.badges.language}
            reason={result.reasons.language}
            iconName="chat"
            delay={0.1}
          />
        </StaggerItem>
        <StaggerItem>
          <BadgeRow
            label="Vocabulary"
            earned={result.badges.vocab}
            reason={result.reasons.vocab}
            iconName="audio-book"
            delay={0.15}
          />
        </StaggerItem>
      </StaggerContainer>

      <MistakeGardenSummary plantedWords={plantedWords} onOpenGarden={onOpenGarden} />

      <FadeIn delay={0.55}>
        <Box display="flex" justify="center" gap={3}>
          <HoverLift>
            <Button variant="outline" onClick={onCopyTranscript}>
              {transcriptCopied ? "Copied!" : "Copy transcript"}
            </Button>
          </HoverLift>
          <HoverLift>
            <Button variant="outline" onClick={onBack}>
              Back to Rooms
            </Button>
          </HoverLift>
          <HoverLift>
            <Button variant="primary" onClick={onReplay}>
              Replay
            </Button>
          </HoverLift>
        </Box>
      </FadeIn>
    </>
  );
}

function CompletionTryAgain({
  reasons,
  plantedWords,
  onOpenGarden,
  onReplay,
  onBack,
}: {
  reasons: JudgeResult["reasons"];
  plantedWords: { phrase: string; meaning: string; isNew: boolean }[];
  onOpenGarden: () => void;
  onReplay: () => void;
  onBack: () => void;
}) {
  return (
    <Box display="flex" direction="column" align="center" gap={5} style={{ maxWidth: 520 }}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          background: "rgba(255,180,80,0.14)",
          border: "1px solid rgba(255,180,80,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="refresh" size="lg" tone="warning" />
      </motion.div>
      <Text variant="heading-sm">Almost there — try again</Text>
      <Text
        variant="body-sm"
        tone="secondary"
        style={{ textAlign: "center" }}
      >
        You didn&apos;t hit any of the three badges this round. No XP awarded — give it another go and you&apos;ll get there.
      </Text>
      <Box
        display="flex"
        direction="column"
        gap={2}
        style={{ width: "100%" }}
      >
        {([
          { label: "Goal", reason: reasons.goal, iconName: "activity" as IconName },
          { label: "Language", reason: reasons.language, iconName: "chat" as IconName },
          { label: "Vocabulary", reason: reasons.vocab, iconName: "audio-book" as IconName },
        ] as const).map((row) =>
          row.reason ? (
            <div
              key={row.label}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: "8px 12px",
                borderRadius: 10,
                background: "var(--tatva-surface-secondary, rgba(255,255,255,0.06))",
                border: "1px solid var(--tatva-border-secondary, rgba(255,255,255,0.14))",
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <Icon name={row.iconName} size="sm" tone="secondary" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--tatva-content-primary, rgba(255,255,255,0.94))",
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--tatva-content-secondary, rgba(255,255,255,0.8))",
                    lineHeight: 1.4,
                  }}
                >
                  {row.reason}
                </span>
              </div>
            </div>
          ) : null
        )}
      </Box>
      <MistakeGardenSummary plantedWords={plantedWords} onOpenGarden={onOpenGarden} />
      <Box display="flex" gap={3}>
        <HoverLift>
          <Button variant="outline" onClick={onBack}>
            Back to Rooms
          </Button>
        </HoverLift>
        <HoverLift>
          <Button variant="primary" onClick={onReplay}>
            Try again
          </Button>
        </HoverLift>
      </Box>
    </Box>
  );
}

function MistakeGardenSummary({
  plantedWords,
  onOpenGarden,
}: {
  plantedWords: { phrase: string; meaning: string; isNew: boolean }[];
  onOpenGarden: () => void;
}) {
  if (plantedWords.length === 0) return null;

  return (
    <Box
      display="flex"
      direction="column"
      gap={3}
      p={4}
      rounded="md"
      bg="surface-secondary"
      borderColor="primary"
      style={{ width: "100%", maxWidth: 520 }}
    >
      <Box display="flex" align="center" justify="between">
        <Box display="flex" align="center" gap={2}>
          <Icon name="plant" size="sm" tone="success" />
          <Text variant="label-md">Mistake Garden updated</Text>
        </Box>
        <Badge variant="brand" size="sm">
          {plantedWords.filter((item) => item.isNew).length} new
        </Badge>
      </Box>

      <Box display="flex" direction="column" gap={2}>
        {plantedWords.slice(0, 4).map((word) => (
          <Box
            key={word.phrase}
            display="flex"
            align="center"
            justify="between"
            p={3}
            rounded="sm"
            bg="surface-primary"
            borderColor="secondary"
          >
            <Box display="flex" direction="column" gap={0}>
              <Text variant="label-sm">{word.phrase}</Text>
              <Text variant="body-xs" tone="secondary">
                {word.meaning}
              </Text>
            </Box>
            <Badge variant={word.isNew ? "green" : "default"} size="sm">
              {word.isNew ? "Planted" : "Already in garden"}
            </Badge>
          </Box>
        ))}
        {plantedWords.length > 4 && (
          <Text variant="body-xs" tone="tertiary">
            +{plantedWords.length - 4} more phrases saved for review.
          </Text>
        )}
      </Box>

      <Box display="flex" justify="end">
        <Button variant="outline" icon="arrow-right" onClick={onOpenGarden}>
          Open Mistake Garden
        </Button>
      </Box>
    </Box>
  );
}
