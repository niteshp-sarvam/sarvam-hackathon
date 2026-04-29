"use client";

import { use, useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Header,
  Text,
  Badge,
  MetricCard,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SCENARIO_ROOMS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { createCard } from "@/lib/fsrs";
import { getCurriculum } from "@/lib/curriculum";
import {
  FadeIn,
  SlideIn,
  StaggerContainer,
  StaggerItem,
  HoverLift,
  PulseRing,
  VoiceWaveform,
  AnimatePresence,
  motion,
  fireConfetti,
} from "@/components/motion";
import { Micdrop } from "@micdrop/client";
import { useMicdropState, useMicdropError } from "@micdrop/react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  translation?: string;
  audioUrl?: string;
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
    addGardenCard,
    addXp,
    addActivity,
    completeLesson,
  } = useAppStore();

  const room = SCENARIO_ROOMS.find((r) => r.id === roomId);
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === room?.language);

  const [isComplete, setIsComplete] = useState(false);
  const [stars, setStars] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [engFallbacks, setEngFallbacks] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [connectionError, setConnectionError] = useState<false | "connection" | "mic">(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const micdropState = useMicdropState();
  useMicdropError((err) => console.error("[Micdrop]", err.message));

  const VOICE_SERVER_URL = process.env.NEXT_PUBLIC_VOICE_SERVER_URL ?? "ws://localhost:8081";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const voiceConversation = micdropState.conversation ?? [];

  useEffect(() => scrollToBottom(), [voiceConversation.length, scrollToBottom]);

  const voiceStartedRef = useRef(false);
  useEffect(() => {
    if (!room) return;
    if (!voiceStartedRef.current) {
      voiceStartedRef.current = true;
      startVoiceSession();
    }
    return () => {
      Micdrop.stop().catch(() => {});
      voiceStartedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, restartKey]);

  function buildSystemPrompt(): string {
    if (!room || !lang) return "";
    const cfg = room.promptConfig;
    const toleranceRule = cfg.englishTolerance === "high"
      ? "If the learner uses English, gently reply in the target language but don't penalize them."
      : cfg.englishTolerance === "medium"
        ? "If the learner uses English, nudge them to try in the target language."
        : "Respond only in the target language. If the learner uses English, ask them to try again in the target language.";
    const formalityRule = cfg.formality === "formal"
      ? "Use formal, respectful register and expect the same."
      : cfg.formality === "polite"
        ? "Use polite but natural register."
        : "Use colloquial, everyday speech.";
    const quirks = cfg.characterQuirks ? `\nCharacter quirks: ${cfg.characterQuirks}` : "";
    const opening = cfg.openingStyle
      ? `- Opening: ${cfg.openingStyle}`
      : `- Start by greeting the learner in ${lang.name} with a short, natural opening line`;

    return `You are playing a character in a language learning scenario.
Character: ${room.persona}
Setting: ${room.setting}
Language: Speak primarily in ${lang.name} (${lang.code}).
Goal for the learner: ${room.goal}${quirks}

RULES:
- Stay in character at all times
${opening}
- Keep responses to 1-3 sentences in ${lang.name}
- ${formalityRule}
- ${toleranceRule}
- After about ${cfg.maxTurns} exchanges, naturally conclude the scenario
- When concluding, add [SCENARIO_COMPLETE] at the end of your message
- Also rate the learner's performance as [STARS:1], [STARS:2], or [STARS:3] based on:
  - Task completion
  - Vocabulary range
  - How little they fell back to English

Respond ONLY as the character. Do not break character.`;
  }

  async function startVoiceSession() {
    if (!room || !lang) return;
    setConnectionError(false);
    const systemPrompt = buildSystemPrompt();

    const wsUrl = new URL(VOICE_SERVER_URL);
    wsUrl.searchParams.set("roomId", room.id);
    wsUrl.searchParams.set("lang", `${lang.code}-IN`);
    wsUrl.searchParams.set("systemPrompt", systemPrompt);

    try {
      await Micdrop.stop().catch(() => {});
      await Micdrop.start({
        url: wsUrl.toString(),
        vad: ["volume"],
      });
    } catch (err) {
      console.error("[VoiceSession] Failed to start:", err);
      const msg = String(err);
      const isMicError = msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("Mic");
      setConnectionError(isMicError ? "mic" : "connection");
    }
  }

  async function stopVoiceSession() {
    await Micdrop.stop().catch(() => {});
    voiceStartedRef.current = false;
  }

  function retryConnection() {
    setConnectionError(false);
    voiceStartedRef.current = false;
    setRestartKey((k) => k + 1);
  }

  const voiceTurnCount = voiceConversation.filter((m) => m.role === "user").length;

  const lastAssistantMsg = [...voiceConversation].reverse().find((m) => m.role === "assistant");
  const lastAssistantContent = lastAssistantMsg && "content" in lastAssistantMsg ? (lastAssistantMsg.content ?? "") : "";
  useEffect(() => {
    if (!lastAssistantContent || isComplete) return;
    const content = lastAssistantContent;
    if (content.includes("[SCENARIO_COMPLETE]") || content.includes("[STARS:")) {
      const starsMatch = content.match(/\[STARS:(\d)\]/);
      const earnedStars = starsMatch ? parseInt(starsMatch[1]) : 0;
      const finalStars = Math.max(1, earnedStars);
      setStars(finalStars);
      setIsComplete(true);
      stopVoiceSession();

      const engCount = voiceConversation
        .filter((m) => m.role === "user")
        .filter((m) => "content" in m && /[a-zA-Z]{3,}/.test(m.content ?? "")).length;
      setTurnCount(voiceTurnCount);
      setEngFallbacks(engCount);

      setTimeout(() => fireConfetti(finalStars >= 2 ? "sides" : "center"), 400);
      addScenarioResult({
        roomId: room!.id,
        stars: finalStars,
        completedAt: new Date().toISOString(),
        vocabUsed: voiceTurnCount,
        engFallbackCount: engCount,
      });
      addActivity({
        type: "scenario_completed",
        id: room!.id,
        meta: { stars: finalStars, turns: voiceTurnCount },
      });

      let linkedLessonFound = false;
      if (targetLanguage) {
        const curriculum = getCurriculum(targetLanguage);
        for (const unit of curriculum) {
          for (const lesson of unit.lessons) {
            if (lesson.linkedScenarioId === room!.id) {
              completeLesson(lesson.id, lesson.xpReward);
              linkedLessonFound = true;
            }
          }
        }
      }
      if (!linkedLessonFound) addXp(finalStars * 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAssistantContent]);

  useEffect(() => {
    return () => {
      Micdrop.stop().catch(() => {});
    };
  }, []);

  if (!room || !lang) {
    return (
      <Box p={8} display="flex" direction="column" align="center" gap={4}>
        <Text variant="heading-md">Room not found</Text>
        <Button variant="primary" onClick={() => router.push("/scenario-rooms")}>
          Back to Rooms
        </Button>
      </Box>
    );
  }

  return (
    <Box display="flex" direction="column" h="full">
      <Header
        type="main"
        left={{
          title: room.title,
          subtitle: `${lang.nativeName} • ${room.difficulty} • Goal: ${room.goal}`,
        }}
        onBack={() => router.push("/scenario-rooms")}
      />

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
                background: connectionError === "mic"
                  ? "linear-gradient(135deg, #FF4B4B, #E53E3E)"
                  : "linear-gradient(135deg, #FFC200, #F49000)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text variant="heading-md" tone="inverse">
                {connectionError === "mic" ? "🎙" : "!"}
              </Text>
            </motion.div>
            <FadeIn delay={0.2}>
              <Text variant="heading-sm">
                {connectionError === "mic"
                  ? "Microphone access denied"
                  : "Could not connect to voice server"}
              </Text>
            </FadeIn>
            <FadeIn delay={0.3}>
              <Text variant="body-sm" tone="secondary" style={{ textAlign: "center", maxWidth: 400 }}>
                {connectionError === "mic"
                  ? "This scenario needs your microphone. Click the lock icon in your browser's address bar, allow microphone access, then retry."
                  : "Make sure the voice server is running and try again."}
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

        {/* Voice conversation */}
        {!connectionError && !isComplete && (
          <Box display="flex" direction="column" grow overflow="hidden">
            <Box grow overflow="auto" p={6}>
              <Box display="flex" direction="column" gap={4}>
                <Box p={4} rounded="lg" bg="tertiary" display="flex" direction="column" gap={2}>
                  <Text variant="label-sm" tone="secondary">Voice Scenario</Text>
                  <Text variant="body-sm">{room.description}</Text>
                  <Box display="flex" gap={2}>
                    <Badge variant="brand">{room.difficulty}</Badge>
                    <Badge variant="indigo">{lang.nativeName}</Badge>
                  </Box>
                </Box>

                {voiceConversation
                  .filter((m) => m.role === "user" || m.role === "assistant")
                  .map((msg, i) => {
                    const Wrapper = msg.role === "user" ? SlideIn : FadeIn;
                    const wrapperProps = msg.role === "user" ? { from: "right" as const } : { direction: "up" as const };
                    const rawContent = "content" in msg ? (msg.content ?? "") : "";
                    const content = rawContent
                      .replace("[SCENARIO_COMPLETE]", "")
                      .replace(/\[STARS:\d\]/g, "")
                      .trim();
                    if (!content) return null;
                    return (
                      <Wrapper key={i} {...wrapperProps}>
                        <Box display="flex" justify={msg.role === "user" ? "end" : "start"}>
                          <div style={{ maxWidth: "75%" }}>
                            <Box
                              p={4} rounded="lg"
                              bg={msg.role === "user" ? "brand" : "surface-secondary"}
                              display="flex" direction="column" gap={2}
                            >
                              <Text variant="body-sm" tone={msg.role === "user" ? "inverse" : "default"}>
                                {content}
                              </Text>
                            </Box>
                          </div>
                        </Box>
                      </Wrapper>
                    );
                  })}

                <AnimatePresence>
                  {micdropState.isAssistantSpeaking && (
                    <FadeIn>
                      <Box display="flex" justify="start">
                        <div style={{ maxWidth: "75%" }}>
                          <Box p={4} rounded="lg" bg="surface-secondary" display="flex" direction="column" gap={2}>
                            <VoiceWaveform active color="#58CC02" barCount={20} style={{ height: 24 }} />
                          </Box>
                        </div>
                      </Box>
                    </FadeIn>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </Box>
            </Box>

            {/* Voice status bar */}
            <Box borderColor="primary" borderSides="t" display="flex" direction="column">
              <Box p={4} display="flex" align="center" justify="between">
                <Box display="flex" align="center" gap={4}>
                  <AnimatePresence mode="wait">
                    {micdropState.isListening || micdropState.isUserSpeaking ? (
                      <motion.div key="listening" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                        <PulseRing color="rgba(239,68,68,0.4)">
                          <Badge variant="red">Listening</Badge>
                        </PulseRing>
                      </motion.div>
                    ) : micdropState.isProcessing ? (
                      <motion.div key="processing" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                        <Badge variant="yellow">Processing</Badge>
                      </motion.div>
                    ) : micdropState.isAssistantSpeaking ? (
                      <motion.div key="speaking" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                        <Badge variant="green">Speaking</Badge>
                      </motion.div>
                    ) : micdropState.isStarting ? (
                      <motion.div key="starting" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                        <Badge variant="default">Connecting...</Badge>
                      </motion.div>
                    ) : (
                      <motion.div key="idle" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                        <Badge variant="default">Ready</Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <VoiceWaveform
                    active={micdropState.isListening || micdropState.isAssistantSpeaking}
                    color={micdropState.isListening ? "#EF4444" : "#58CC02"}
                    barCount={20}
                    style={{ height: 20 }}
                  />
                  <Text variant="body-sm" tone="secondary">
                    Turns: {voiceTurnCount}
                  </Text>
                </Box>
                <HoverLift>
                  <Button variant="destructive" onClick={() => stopVoiceSession()}>
                    End
                  </Button>
                </HoverLift>
              </Box>
            </Box>
          </Box>
        )}

        {/* Completion panel */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{ flex: 1, display: "flex" }}
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
              <Box display="flex" align="center" gap={4}>
                <Box display="flex" gap={1}>
                  {[1, 2, 3].map((s) => (
                    <motion.span
                      key={s}
                      initial={{ opacity: 0, scale: 0, rotate: -30 }}
                      animate={{
                        opacity: 1,
                        scale: s <= stars ? 1 : 0.5,
                        rotate: 0,
                      }}
                      transition={{
                        delay: s * 0.15,
                        type: "spring",
                        stiffness: 500,
                        damping: 15,
                      }}
                      style={{
                        fontSize: 28,
                        color: s <= stars ? "#FFC800" : "#D0D0D0",
                      }}
                    >
                      ★
                    </motion.span>
                  ))}
                </Box>
                <FadeIn delay={0.5}>
                  <Text variant="heading-sm">Scenario Complete!</Text>
                </FadeIn>
              </Box>
              <StaggerContainer className="grid grid-cols-3 gap-tatva-6">
                <StaggerItem>
                  <MetricCard heading="Turns" value={turnCount.toString()} />
                </StaggerItem>
                <StaggerItem>
                  <MetricCard
                    heading="English Fallbacks"
                    value={engFallbacks.toString()}
                  />
                </StaggerItem>
                <StaggerItem>
                  <MetricCard heading="Stars" value={stars.toString()} />
                </StaggerItem>
              </StaggerContainer>
              <FadeIn delay={0.6}>
                <Box display="flex" justify="center" gap={4}>
                  <HoverLift>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/scenario-rooms")}
                    >
                      Back to Rooms
                    </Button>
                  </HoverLift>
                  <HoverLift>
                    <Button
                      variant="primary"
                      onClick={() => {
                        stopVoiceSession();
                        setIsComplete(false);
                        setStars(0);
                        setTurnCount(0);
                        setEngFallbacks(0);
                        voiceStartedRef.current = false;
                        setRestartKey((k) => k + 1);
                      }}
                    >
                      Replay
                    </Button>
                  </HoverLift>
                </Box>
              </FadeIn>
            </Box>
          </motion.div>
        )}
      </Box>
    </Box>
  );
}
