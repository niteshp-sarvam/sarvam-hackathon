"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Header,
  Icon,
  Text,
  Badge,
  Skeleton,
  Tabs,
  OptionGroup,
  OptionItem,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { reviewCard, getDueCards, createCard, type Rating } from "@/lib/fsrs";
import type { FSRSCard } from "@/lib/fsrs";
import { useNativeText, speak } from "@/lib/native-text";
import { GAME_COLORS, GAME_TINTS, GAME_GRADIENTS } from "@/lib/theme-tokens";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  ScaleIn,
  HoverLift,
  SlideUpReveal,
  ProgressBar,
  CountUpRing,
  AnimatePresence,
  AnimatedCounter,
  motion,
  fireConfetti,
} from "@/components/motion";

type IconName = Parameters<typeof Icon>[0]["name"];

const STAGE_CONFIG: Record<string, { label: string; icon: IconName; tint: string; border: string; text: string }> = {
  seed: { label: "Seed", icon: "plant", tint: GAME_TINTS.warningBg, border: GAME_TINTS.warningBorder, text: GAME_COLORS.warning },
  sprout: { label: "Sprout", icon: "plant", tint: GAME_TINTS.successBg, border: GAME_TINTS.successBorder, text: GAME_COLORS.success },
  growing: { label: "Growing", icon: "arrow-up", tint: GAME_TINTS.infoBg, border: GAME_TINTS.infoBorder, text: GAME_COLORS.info },
  blooming: { label: "Blooming", icon: "like", tint: GAME_TINTS.brandBg, border: GAME_TINTS.brandBorder, text: GAME_COLORS.brand },
  harvested: { label: "Harvested", icon: "success", tint: GAME_TINTS.xpBg, border: GAME_TINTS.xpBorder, text: GAME_COLORS.xp },
};

const RATING_CONFIG: { r: Rating; label: string; icon: IconName; bg: string; text: string; border: string }[] = [
  { r: 1, label: "Forgot", icon: "error", bg: GAME_TINTS.dangerBg, text: GAME_COLORS.dangerAlt, border: GAME_TINTS.dangerBorder },
  { r: 2, label: "Hard", icon: "warning", bg: GAME_TINTS.warningBg, text: GAME_COLORS.warning, border: GAME_TINTS.warningBorder },
  { r: 3, label: "Good", icon: "check", bg: GAME_TINTS.successBg, text: GAME_COLORS.success, border: GAME_TINTS.successBorder },
  { r: 4, label: "Easy", icon: "favourite", bg: GAME_TINTS.infoBg, text: GAME_COLORS.info, border: GAME_TINTS.infoBorder },
];

function useCardNative(card: FSRSCard) {
  const { nativeText: fetched } = useNativeText(
    card.nativeText ? null : card.word,
    card.nativeText ? null : card.language
  );
  return card.nativeText || fetched || card.word;
}

function GardenCardWord({ card }: { card: FSRSCard }) {
  const native = useCardNative(card);
  const [playing, setPlaying] = useState(false);

  async function play(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (playing) return;
    setPlaying(true);
    const audio = await speak(native, card.language);
    if (audio) {
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
    } else {
      setPlaying(false);
    }
  }

  return (
    <Box display="flex" direction="column" align="center" gap={2}>
      <Box display="flex" align="center" gap={3}>
        <Text
          variant="heading-lg"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.1)" }}
        >
          {native}
        </Text>
        <Button
          variant="ghost"
          size="sm"
          icon={playing ? "pause" : "audio-book"}
          onClick={play}
        >
          {""}
        </Button>
      </Box>
      {native !== card.word && (
        <Text variant="body-sm" tone="tertiary">{card.word}</Text>
      )}
    </Box>
  );
}

function GardenCardLabel({ card }: { card: FSRSCard }) {
  const native = useCardNative(card);
  return (
    <Box display="flex" direction="column" gap={0}>
      <Text variant="label-md">{native}</Text>
      {native !== card.word && (
        <Text variant="body-xs" tone="tertiary">{card.word}</Text>
      )}
    </Box>
  );
}

export default function GardenPage() {
  const router = useRouter();
  const {
    isHydrated,
    gardenCards,
    targetLanguage,
    updateGardenCard,
    addGardenCard,
    addXp,
    addActivity,
    markFoundationLesson,
  } = useAppStore();

  const [tab, setTab] = useState("review");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);

  const dueCards = useMemo(() => getDueCards(gardenCards), [gardenCards]);

  const stageGroups = useMemo(() => {
    const groups: Record<string, FSRSCard[]> = {
      seed: [], sprout: [], growing: [], blooming: [], harvested: [],
    };
    gardenCards.forEach((c) => groups[c.gardenStage]?.push(c));
    return groups;
  }, [gardenCards]);

  function handleRate(rating: Rating) {
    const card = dueCards[currentCardIndex];
    if (!card) return;

    const updated = reviewCard(card, rating);
    updateGardenCard(card.id, updated);
    markFoundationLesson("garden");
    const earned = rating >= 3 ? 10 : 5;
    setReviewedCount((c) => c + 1);
    setSessionXp((x) => x + earned);
    addXp(earned);
    setShowAnswer(false);

    if (currentCardIndex + 1 >= dueCards.length) {
      setSessionComplete(true);
      setTimeout(() => fireConfetti("center"), 300);
      addActivity({
        type: "review_session",
        id: `garden-${Date.now()}`,
        meta: { reviewed: reviewedCount + 1, xp: sessionXp + earned },
      });
    } else {
      setCurrentCardIndex((i) => i + 1);
    }
  }

  function addDemoCards() {
    type DemoSeed = [
      roman: string,
      native: string,
      translation: string,
      category: FSRSCard["category"]
    ];
    const DEMO_WORDS: Record<string, DemoSeed[]> = {
      hi: [["namaste", "नमस्ते", "hello/greeting", "vocabulary"], ["dhanyavaad", "धन्यवाद", "thank you", "vocabulary"], ["aap kaise hain", "आप कैसे हैं", "how are you", "grammar"], ["theek hai", "ठीक है", "okay/alright", "vocabulary"], ["kitne ka hai", "कितने का है", "how much is it", "vocabulary"], ["thoda", "थोड़ा", "a little", "vocabulary"], ["bahut", "बहुत", "very much", "vocabulary"], ["vah gaya", "वह गया", "he went", "grammar"]],
      ta: [["vanakkam", "வணக்கம்", "hello/greeting", "vocabulary"], ["nandri", "நன்றி", "thank you", "vocabulary"], ["eppadi irukeenga", "எப்படி இருக்கீங்க", "how are you", "grammar"], ["seri", "சரி", "okay/alright", "vocabulary"], ["enna vilai", "என்ன விலை", "what is the price", "vocabulary"], ["konjam", "கொஞ்சம்", "a little", "vocabulary"], ["romba", "ரொம்ப", "very much", "vocabulary"], ["poyttaan", "போய்ட்டான்", "he went", "grammar"]],
      te: [["namaskaram", "నమస్కారం", "hello/greeting", "vocabulary"], ["dhanyavaadaalu", "ధన్యవాదాలు", "thank you", "vocabulary"], ["meeru ela unnaru", "మీరు ఎలా ఉన్నారు", "how are you", "grammar"], ["sare", "సరే", "okay/alright", "vocabulary"], ["entha dhara", "ఎంత ధర", "what is the price", "vocabulary"], ["konchem", "కొంచెం", "a little", "vocabulary"], ["chaala", "చాలా", "very much", "vocabulary"], ["vellaadu", "వెళ్ళాడు", "he went", "grammar"]],
      kn: [["namaskara", "ನಮಸ್ಕಾರ", "hello/greeting", "vocabulary"], ["dhanyavaada", "ಧನ್ಯವಾದ", "thank you", "vocabulary"], ["hēgiddīra", "ಹೇಗಿದ್ದೀರಾ", "how are you", "grammar"], ["sari", "ಸರಿ", "okay/alright", "vocabulary"], ["ēnu bele", "ಏನು ಬೆಲೆ", "what is the price", "vocabulary"], ["svalpa", "ಸ್ವಲ್ಪ", "a little", "vocabulary"], ["thumba", "ತುಂಬಾ", "very much", "vocabulary"], ["hōda", "ಹೋದ", "he went", "grammar"]],
      bn: [["nomoshkar", "নমস্কার", "hello/greeting", "vocabulary"], ["dhonnobad", "ধন্যবাদ", "thank you", "vocabulary"], ["kemon achhen", "কেমন আছেন", "how are you", "grammar"], ["thik achhe", "ঠিক আছে", "okay/alright", "vocabulary"], ["koto dam", "কত দাম", "what is the price", "vocabulary"], ["ektu", "একটু", "a little", "vocabulary"], ["onek", "অনেক", "very much", "vocabulary"], ["she gechhe", "সে গেছে", "he went", "grammar"]],
      mr: [["namaskar", "नमस्कार", "hello/greeting", "vocabulary"], ["dhanyavaad", "धन्यवाद", "thank you", "vocabulary"], ["kase aahat", "कसे आहात", "how are you", "grammar"], ["theek aahe", "ठीक आहे", "okay/alright", "vocabulary"], ["kay bhaav aahe", "काय भाव आहे", "what is the price", "vocabulary"], ["thoda", "थोडं", "a little", "vocabulary"], ["khoop", "खूप", "very much", "vocabulary"], ["to gela", "तो गेला", "he went", "grammar"]],
      ml: [["namaskaram", "നമസ്കാരം", "hello/greeting", "vocabulary"], ["nanni", "നന്ദി", "thank you", "vocabulary"], ["sugham aano", "സുഖമാണോ", "how are you", "grammar"], ["shari", "ശരി", "okay/alright", "vocabulary"], ["entha vila", "എന്ത വില", "what is the price", "vocabulary"], ["kurachu", "കുറച്ച്", "a little", "vocabulary"], ["valare", "വളരെ", "very much", "vocabulary"], ["avan poyi", "അവൻ പോയി", "he went", "grammar"]],
      gu: [["namaste", "નમસ્તે", "hello/greeting", "vocabulary"], ["aabhaar", "આભાર", "thank you", "vocabulary"], ["kem cho", "કેમ છો", "how are you", "grammar"], ["theek che", "ઠીક છે", "okay/alright", "vocabulary"], ["ketla nu", "કેટલા નું", "what is the price", "vocabulary"], ["thodu", "થોડું", "a little", "vocabulary"], ["ghanu", "ઘણું", "very much", "vocabulary"], ["te gayo", "તે ગયો", "he went", "grammar"]],
    };

    const langCode = targetLanguage;
    if (!langCode) return;
    const demoWords = DEMO_WORDS[langCode];
    if (!demoWords) return;

    demoWords.forEach(([roman, native, translation, category]) => {
      const existing = gardenCards.find(
        (c) => c.word === roman && c.language === langCode
      );
      if (!existing) {
        addGardenCard(
          createCard(roman, translation, langCode, category, native)
        );
      }
    });
  }

  const currentCard = dueCards[currentCardIndex];

  if (!isHydrated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Header type="main" left={{ title: "Mistake Garden" }} />
        <Box display="flex" direction="column" gap={6} grow overflow="auto" style={{ paddingBottom: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={88} />
            ))}
          </div>
          <Box display="flex" direction="column" gap={3}>
            <Skeleton height={32} width={180} />
            <Skeleton height={220} />
          </Box>
          <div className="grid grid-cols-3 gap-tatva-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={120} />
            ))}
          </div>
        </Box>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header type="main" left={{ title: "Mistake Garden" }} />

      <Box display="flex" direction="column" gap={6} grow overflow="auto" style={{ paddingBottom: 32 }}>
        {/* Stage stats row */}
        <StaggerContainer style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {(Object.entries(STAGE_CONFIG) as [string, (typeof STAGE_CONFIG)[string]][]).map(
            ([stage, config]) => {
              const count = stageGroups[stage]?.length ?? 0;
              return (
                <StaggerItem key={stage}>
                  <HoverLift>
                    <Box
                      p={4}
                      rounded="lg"
                      display="flex"
                      direction="column"
                      align="center"
                      gap={2}
                      style={{
                        background: config.tint,
                        border: `1px solid ${config.border}`,
                        minHeight: 80,
                      }}
                    >
                      <Icon name={config.icon} size="md" tone="secondary" />
                      <AnimatedCounter
                        value={count}
                        style={{ fontSize: 20, fontWeight: 700, color: config.text }}
                      />
                      <Text variant="body-xs" tone="secondary">{config.label}</Text>
                    </Box>
                  </HoverLift>
                </StaggerItem>
              );
            }
          )}
        </StaggerContainer>

        <Tabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            {
              value: "review",
              label: "Review Due",
              badge: dueCards.length > 0 ? { value: dueCards.length.toString() } : undefined,
            },
            { value: "garden", label: "Full Garden" },
          ]}
        />

        {tab === "review" && (
          <Box display="flex" direction="column" gap={4}>
            {gardenCards.length === 0 ? (
              <SlideUpReveal>
                <Box
                  p={10}
                  display="flex"
                  direction="column"
                  align="center"
                  gap={4}
                  rounded="lg"
                  bg="surface-secondary"
                  style={{ textAlign: "center" }}
                >
                  <ScaleIn>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "rgba(88, 204, 2, 0.10)",
                        border: "1px solid rgba(88, 204, 2, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="plant" size="lg" tone="success" />
                    </div>
                  </ScaleIn>
                  <Text variant="heading-sm">Your garden is empty</Text>
                  <Text
                    variant="body-sm"
                    tone="secondary"
                    style={{ maxWidth: 380 }}
                  >
                    Words you stumble on become seeds here. Complete a lesson, try a Scenario, or shadow a phrase — every mistake plants a new flashcard you&apos;ll review later.
                  </Text>
                  <Box display="flex" gap={3} mt={2}>
                    <HoverLift>
                      <Button
                        variant="primary"
                        size="lg"
                        icon="play"
                        onClick={() => router.push("/learning-path")}
                      >
                        Start a lesson
                      </Button>
                    </HoverLift>
                    <HoverLift>
                      <Button
                        variant="ghost"
                        size="lg"
                        icon="plant"
                        onClick={addDemoCards}
                      >
                        Plant demo seeds
                      </Button>
                    </HoverLift>
                  </Box>
                </Box>
              </SlideUpReveal>
            ) : sessionComplete || dueCards.length === 0 ? (
              <SlideUpReveal>
                <Box
                  p={8}
                  display="flex"
                  direction="column"
                  align="center"
                  gap={5}
                  rounded="lg"
                  bg="surface-secondary"
                >
                  <ScaleIn>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: sessionComplete
                          ? "linear-gradient(135deg, rgba(88,204,2,0.15), rgba(28,176,246,0.1))"
                          : "linear-gradient(135deg, rgba(28,176,246,0.15), rgba(99,102,241,0.1))",
                        border: sessionComplete
                          ? "2px solid rgba(88,204,2,0.3)"
                          : "2px solid rgba(28,176,246,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={sessionComplete ? "success" : "check"} size="lg" tone={sessionComplete ? "success" : "brand"} />
                    </div>
                  </ScaleIn>
                  <FadeIn delay={0.2}>
                    <Text variant="heading-sm">
                      {sessionComplete ? "Review Complete!" : "All caught up!"}
                    </Text>
                  </FadeIn>
                  {sessionComplete && (
                    <FadeIn delay={0.3}>
                      <Box display="flex" direction="column" align="center" gap={3}>
                        <CountUpRing
                          percent={Math.min((sessionXp / 100) * 100, 100)}
                          size={72}
                          strokeWidth={5}
                          color={GAME_COLORS.success}
                        >
                          <span style={{ fontSize: 15, fontWeight: 700, color: GAME_COLORS.success }}>
                            +<AnimatedCounter value={sessionXp} />
                          </span>
                        </CountUpRing>
                        <Text variant="body-sm" tone="secondary">XP earned</Text>
                      </Box>
                    </FadeIn>
                  )}
                  <FadeIn delay={0.4}>
                    <Text variant="body-sm" tone="secondary">
                      {sessionComplete
                        ? `${reviewedCount} cards reviewed. Your garden is thriving!`
                        : "No cards due. Keep practicing to plant more seeds!"}
                    </Text>
                  </FadeIn>
                  {sessionComplete && (
                    <FadeIn delay={0.5}>
                      <Box display="flex" direction="column" gap={6} align="center" style={{ width: "100%" }}>
                        <HoverLift>
                          <Button
                            variant="primary"
                            onClick={() => {
                              setSessionComplete(false);
                              setCurrentCardIndex(0);
                              setReviewedCount(0);
                              setSessionXp(0);
                            }}
                          >
                            Review Again
                          </Button>
                        </HoverLift>
                        <Box display="flex" direction="column" gap={3} style={{ width: "100%" }}>
                          <Text variant="label-md" tone="secondary">What&apos;s next?</Text>
                          <OptionGroup>
                            <OptionItem
                              label="Practice Speaking"
                              description="Shadow repeat to improve pronunciation"
                              icon={<Icon name="microphone" size="sm" tone="secondary" />}
                              onClick={() => router.push("/shadow-speaking")}
                            />
                            <OptionItem
                              label="Listen on Eavesdrop"
                              description="Hear natural conversations"
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
                      </Box>
                    </FadeIn>
                  )}
                </Box>
              </SlideUpReveal>
            ) : (
              currentCard && (
                <SlideUpReveal>
                  <Box display="flex" direction="column" gap={4}>
                    {/* Progress indicator */}
                    <Box display="flex" align="center" gap={3}>
                      <Text variant="label-sm" tone="tertiary">
                        {currentCardIndex + 1} / {dueCards.length}
                      </Text>
                      <div style={{ flex: 1 }}>
                        <ProgressBar
                          percent={((currentCardIndex + 1) / dueCards.length) * 100}
                          color={GAME_GRADIENTS.brand}
                          height={6}
                        />
                      </div>
                      <Badge variant="brand" size="sm">
                        {STAGE_CONFIG[currentCard.gardenStage]?.label ?? "Unknown"}
                      </Badge>
                    </Box>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentCardIndex}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                      >
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
                          <Box display="flex" gap={2}>
                            <Badge variant="brand">
                              {STAGE_CONFIG[currentCard.gardenStage]?.label ?? "Unknown"}
                            </Badge>
                            <Badge variant="default">{currentCard.category}</Badge>
                          </Box>

                          <ScaleIn>
                            <GardenCardWord card={currentCard} />
                          </ScaleIn>

                          <AnimatePresence mode="wait">
                            {!showAnswer ? (
                              <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <motion.div
                                  animate={{ opacity: [0.7, 1, 0.7] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                  <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => setShowAnswer(true)}
                                  >
                                    Tap to reveal
                                  </Button>
                                </motion.div>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="answer"
                                initial={{ opacity: 0, rotateY: 90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                transition={{ duration: 0.4 }}
                              >
                                <Box display="flex" direction="column" align="center" gap={6}>
                                  <Text variant="body-lg" tone="secondary">
                                    {currentCard.translation}
                                  </Text>

                                  <Text variant="label-sm" tone="tertiary">
                                    How well did you remember?
                                  </Text>
                                  <Box display="flex" gap={3}>
                                    {RATING_CONFIG.map((opt) => (
                                      <HoverLift key={opt.r} onClick={() => handleRate(opt.r)}>
                                        <div
                                          style={{
                                            padding: "10px 16px",
                                            borderRadius: 20,
                                            background: opt.bg,
                                            border: `1px solid ${opt.border}`,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 4,
                                            minWidth: 64,
                                          }}
                                        >
                                          <Icon name={opt.icon} size="md" tone="secondary" />
                                          <span style={{ fontSize: 12, fontWeight: 600, color: opt.text }}>
                                            {opt.label}
                                          </span>
                                        </div>
                                      </HoverLift>
                                    ))}
                                  </Box>
                                </Box>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Box>
                      </motion.div>
                    </AnimatePresence>
                  </Box>
                </SlideUpReveal>
              )
            )}
          </Box>
        )}

        {tab === "garden" && (
          <StaggerContainer style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {(Object.entries(stageGroups) as [string, FSRSCard[]][]).map(
              ([stage, cards]) =>
                cards.length > 0 && (
                  <StaggerItem key={stage}>
                    <Box display="flex" direction="column" gap={3}>
                      <Box display="flex" align="center" gap={2}>
                        <Icon name={STAGE_CONFIG[stage]?.icon ?? "plant"} size="md" tone="secondary" />
                        <Text variant="heading-sm">{STAGE_CONFIG[stage]?.label ?? stage}</Text>
                        <Badge variant="brand">{cards.length}</Badge>
                      </Box>
                      <div className="grid grid-cols-3 gap-tatva-4">
                        {cards.map((card, i) => (
                          <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.8) }}
                          >
                            <HoverLift>
                              <Box
                                p={4}
                                rounded="lg"
                                borderColor="primary"
                                bg="surface-secondary"
                                display="flex"
                                direction="column"
                                gap={2}
                                style={{
                                  borderLeft: `3px solid ${STAGE_CONFIG[card.gardenStage]?.text ?? "#666"}`,
                                }}
                              >
                                <Box display="flex" justify="between" align="center">
                                  <GardenCardLabel card={card} />
                                  <Icon name={STAGE_CONFIG[card.gardenStage]?.icon ?? "plant"} size="sm" tone="secondary" />
                                </Box>
                                <Text variant="body-sm" tone="secondary">
                                  {card.translation}
                                </Text>
                                <Badge variant="default" size="sm">
                                  {card.category}
                                </Badge>
                              </Box>
                            </HoverLift>
                          </motion.div>
                        ))}
                      </div>
                    </Box>
                  </StaggerItem>
                )
            )}
            {gardenCards.length === 0 && (
              <StaggerItem>
                <SlideUpReveal>
                  <Box p={8} display="flex" direction="column" align="center" gap={4}>
                    <Icon name="plant" size="lg" tone="secondary" />
                    <Text variant="body-md" tone="secondary">
                      No plants yet. Start practicing to grow your garden!
                    </Text>
                    <HoverLift>
                      <Button variant="primary" icon="plant" onClick={addDemoCards}>
                        Plant Demo Seeds
                      </Button>
                    </HoverLift>
                  </Box>
                </SlideUpReveal>
              </StaggerItem>
            )}
          </StaggerContainer>
        )}
      </Box>
    </div>
  );
}
