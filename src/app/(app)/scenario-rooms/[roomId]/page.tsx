"use client";

import { use, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Header,
  Icon,
  Text,
  Badge,
  MetricCard,
  OptionGroup,
  OptionItem,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SCENARIO_ROOMS, SUPPORTED_LANGUAGES, GREETING_SUGGESTIONS } from "@/lib/constants";
import { createCard } from "@/lib/fsrs";
import { getCurriculum } from "@/lib/curriculum";
import {
  FadeIn,
  SlideIn,
  StaggerContainer,
  StaggerItem,
  HoverLift,
  TranscriptPanel,
  SuggestionChips,
  HintCard,
  parseSuggestions,
  stripSuggestions,
  AnimatePresence,
  motion,
  fireConfetti,
} from "@/components/motion";
import MeshSphere from "@/components/MeshSphere";
import { Micdrop } from "@micdrop/client";
import { useMicdropState, useMicdropError, useSpeakerVolume, useMicVolume } from "@micdrop/react";
import { toast } from "sonner";
import { GAME_COLORS, GAME_GRADIENTS } from "@/lib/theme-tokens";

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
  const nativeLang = SUPPORTED_LANGUAGES.find((l) => l.code === nativeLanguage);
  const nativeLangName = nativeLang?.name ?? "English";

  const [isComplete, setIsComplete] = useState(false);
  const [stars, setStars] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [nativeFallbacks, setNativeFallbacks] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [connectionError, setConnectionError] = useState<false | "connection" | "mic">(false);

  const voiceStartedRef = useRef(false);
  const startingRef = useRef(false);
  const cancelledRef = useRef(false);

  const micdropState = useMicdropState();
  useMicdropError((err) => {
    if (cancelledRef.current) return;
    console.error("[Micdrop]", err.message);

    const message = (err.message ?? "").toLowerCase();

    const isMicError =
      message.includes("permission") ||
      message.includes("notallowed") ||
      message.includes("microphone") ||
      message.includes("mic ") ||
      message.includes("getusermedia");

    const isConnectionError =
      message.includes("websocket") ||
      message.includes("connect") ||
      message.includes("network") ||
      message.includes("disconnect") ||
      message.includes("closed") ||
      message.includes("server");

    if (isMicError) {
      setConnectionError("mic");
    } else if (isConnectionError) {
      setConnectionError("connection");
    } else {
      // Treat as transient — surface a toast but keep the session alive
      toast.error(`Voice glitch: ${err.message}`, { duration: 3500 });
    }
  });
  const { speakerVolume, maxSpeakerVolume } = useSpeakerVolume();
  const { micVolume, maxMicVolume } = useMicVolume();

  const normalizedSpeaker = maxSpeakerVolume > 0 ? speakerVolume / maxSpeakerVolume : 0;
  const normalizedMic = maxMicVolume > 0 ? micVolume / maxMicVolume : 0;

  const VOICE_SERVER_URL = process.env.NEXT_PUBLIC_VOICE_SERVER_URL ?? "ws://localhost:8081";

  const voiceConversation = micdropState.conversation ?? [];

  useEffect(() => {
    if (!room) return;
    cancelledRef.current = false;
    if (!voiceStartedRef.current && !startingRef.current) {
      voiceStartedRef.current = true;
      startingRef.current = true;
      startVoiceSession().finally(() => { startingRef.current = false; });
    }
    return () => {
      cancelledRef.current = true;
      Micdrop.stop().catch(() => {});
      voiceStartedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, restartKey]);

  function buildSystemPrompt(): string {
    if (!room || !lang) return "";
    const cfg = room.promptConfig;
    const toleranceRule = cfg.nativeTolerance === "high"
      ? `If the learner uses ${nativeLangName} or another language, gently reply in ${lang.name} but don't penalize them.`
      : cfg.nativeTolerance === "medium"
        ? `If the learner uses ${nativeLangName} or another language, nudge them to try in ${lang.name}.`
        : `Respond only in ${lang.name}. If the learner uses another language, ask them to try again in ${lang.name}.`;
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
  - How little they fell back to their native language
- After EVERY response, include 2-3 suggested replies the learner could say next.
  Format: [SUGGEST:phrase1 (${nativeLangName} meaning)|phrase2 (${nativeLangName} meaning)|phrase3 (${nativeLangName} meaning)]
  Write the phrases in Romanized ${lang.name} so a beginner can read and pronounce them.

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
      if (cancelledRef.current) return;
      await new Promise((r) => setTimeout(r, 300));
      if (cancelledRef.current) return;
      await Micdrop.start({
        url: wsUrl.toString(),
        vad: ["volume"],
      });
    } catch (err) {
      if (cancelledRef.current) return;
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

  const currentSuggestions = useMemo(() => {
    if (voiceTurnCount === 0 && room) {
      return GREETING_SUGGESTIONS[room.language] ?? [];
    }
    if (lastAssistantContent) {
      return parseSuggestions(lastAssistantContent);
    }
    return [];
  }, [voiceTurnCount, lastAssistantContent, room]);

  const transcriptMessages = useMemo(() => {
    return voiceConversation
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((msg) => {
        const rawContent = "content" in msg ? (msg.content ?? "") : "";
        const content = stripSuggestions(
          rawContent.replace("[SCENARIO_COMPLETE]", "").replace(/\[STARS:\d\]/g, "")
        ).trim();
        return { role: msg.role as "user" | "assistant", content };
      })
      .filter((m) => m.content.length > 0);
  }, [voiceConversation]);

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

      const nativeFallbackCount = voiceConversation
        .filter((m) => m.role === "user")
        .filter((m) => "content" in m && /[a-zA-Z]{3,}/.test(m.content ?? "")).length;
      setTurnCount(voiceTurnCount);
      setNativeFallbacks(nativeFallbackCount);

      setTimeout(() => fireConfetti(finalStars >= 2 ? "sides" : "center"), 400);
      addScenarioResult({
        roomId: room!.id,
        stars: finalStars,
        completedAt: new Date().toISOString(),
        vocabUsed: voiceTurnCount,
        engFallbackCount: nativeFallbackCount,
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

  const sphereState: "idle" | "listening" | "speaking" | "processing" =
    micdropState.isAssistantSpeaking ? "speaking"
    : micdropState.isListening || micdropState.isUserSpeaking ? "listening"
    : micdropState.isProcessing ? "processing"
    : "idle";

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
                  ? GAME_GRADIENTS.danger
                  : GAME_GRADIENTS.warning,
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

        {/* Voice conversation — immersive layout */}
        {!connectionError && !isComplete && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}>
            {/* Top section: Sphere + Status */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 16px 12px",
              gap: 12,
              flexShrink: 0,
            }}>
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
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  {sphereState === "listening" && (
                    <>
                      <Badge variant="red">Listening</Badge>
                      <Text variant="body-xs" tone="secondary">Speak now...</Text>
                    </>
                  )}
                  {sphereState === "speaking" && (
                    <Badge variant="green">Speaking</Badge>
                  )}
                  {sphereState === "processing" && (
                    <Badge variant="yellow">Processing</Badge>
                  )}
                  {sphereState === "idle" && micdropState.isStarting && (
                    <Badge variant="default">Connecting...</Badge>
                  )}
                  {sphereState === "idle" && !micdropState.isStarting && (
                    <Badge variant="default">Ready</Badge>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Suggestion chips */}
            <div style={{ padding: "0 20px", flexShrink: 0 }}>
              <AnimatePresence mode="wait">
                {currentSuggestions.length > 0 && (
                  <SuggestionChips
                    key={currentSuggestions.map((s) => s.phrase).join(",")}
                    suggestions={currentSuggestions}
                    isUserSpeaking={micdropState.isUserSpeaking}
                    style={{ padding: "4px 0" }}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Transcript panel */}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <TranscriptPanel
                messages={transcriptMessages}
                isAssistantSpeaking={micdropState.isAssistantSpeaking}
                style={{ height: "100%" }}
              />
            </div>

            {/* Bottom bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 16px 12px",
              gap: 8,
              borderTop: "1px solid var(--tatva-border-primary, rgba(255,255,255,0.08))",
              flexShrink: 0,
            }}>
              <HintCard
                goal={room.goal}
                suggestions={currentSuggestions}
                style={{ flex: 1, maxWidth: 360 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Text variant="body-xs" tone="secondary">
                  Turn {voiceTurnCount}
                </Text>
                <HoverLift>
                  <Button variant="destructive" onClick={() => stopVoiceSession()}>
                    End
                  </Button>
                </HoverLift>
              </div>
            </div>
          </div>
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
                        color: s <= stars ? GAME_COLORS.xpStar : GAME_COLORS.starInactive,
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
                    heading="Native Fallbacks"
                    value={nativeFallbacks.toString()}
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
                        setNativeFallbacks(0);
                        voiceStartedRef.current = false;
                        setRestartKey((k) => k + 1);
                      }}
                    >
                      Replay
                    </Button>
                  </HoverLift>
                </Box>
              </FadeIn>
              <FadeIn delay={0.8}>
                <Box display="flex" direction="column" gap={3} style={{ width: "100%" }}>
                  <Text variant="label-md" tone="secondary">What&apos;s next?</Text>
                  <OptionGroup>
                    <OptionItem
                      label="Try Another Room"
                      description="Practice a different scenario"
                      icon={<Icon name="chat-multiple" size="sm" tone="secondary" />}
                      onClick={() => router.push("/scenario-rooms")}
                    />
                    <OptionItem
                      label="Practice Pronunciation"
                      description="Shadow repeat to sharpen your accent"
                      icon={<Icon name="microphone" size="sm" tone="secondary" />}
                      onClick={() => router.push("/shadow-speaking")}
                    />
                    {nativeFallbacks > 0 && (
                      <OptionItem
                        label="Review in Garden"
                        description="Strengthen words you struggled with"
                        icon={<Icon name="plant" size="sm" tone="secondary" />}
                        onClick={() => router.push("/garden")}
                      />
                    )}
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
      </Box>
    </Box>
  );
}
