"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Header,
  Icon,
  Text,
  Badge,
  Tabs,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { reviewCard, getDueCards, createCard, type Rating } from "@/lib/fsrs";
import type { FSRSCard } from "@/lib/fsrs";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  ScaleIn,
  HoverLift,
  ProgressBar,
  AnimatePresence,
  AnimatedCounter,
  motion,
  fireConfetti,
} from "@/components/motion";

type IconName = Parameters<typeof Icon>[0]["name"];

const STAGE_CONFIG = {
  seed: { label: "Seed", color: "yellow" as const, icon: "plant" as IconName, bg: "#FFF3CD" },
  sprout: { label: "Sprout", color: "green" as const, icon: "plant" as IconName, bg: "#D4EDDA" },
  growing: { label: "Growing", color: "brand" as const, icon: "arrow-up" as IconName, bg: "#CCE5FF" },
  blooming: { label: "Blooming", color: "indigo" as const, icon: "like" as IconName, bg: "#E8DAEF" },
  harvested: { label: "Harvested", color: "green" as const, icon: "success" as IconName, bg: "#D5F5E3" },
};

export default function GardenPage() {
  const {
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
    const demoWords: [string, string, FSRSCard["category"]][] = [
      ["vanakkam", "hello/greeting", "vocabulary"],
      ["nandri", "thank you", "vocabulary"],
      ["eppadi irukeenga", "how are you", "grammar"],
      ["seri", "okay/alright", "vocabulary"],
      ["enna vilai", "what is the price", "vocabulary"],
      ["konjam", "a little", "vocabulary"],
      ["romba", "very much", "vocabulary"],
      ["poidraan", "he went", "grammar"],
    ];

    demoWords.forEach(([word, translation, category]) => {
      const existing = gardenCards.find(
        (c) => c.word === word && c.language === (targetLanguage ?? "ta")
      );
      if (!existing) {
        addGardenCard(
          createCard(word, translation, targetLanguage ?? "ta", category)
        );
      }
    });
  }

  const currentCard = dueCards[currentCardIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header
        type="main"
        left={{
          title: "Mistake Garden",
          subtitle: "Every mistake plants a seed. Nurture them into knowledge.",
        }}
      />

      <Box display="flex" direction="column" gap={6} grow overflow="auto">
        {/* Garden stats */}
        <StaggerContainer style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
          {(Object.entries(STAGE_CONFIG) as [keyof typeof STAGE_CONFIG, (typeof STAGE_CONFIG)[keyof typeof STAGE_CONFIG]][]).map(
            ([stage, config]) => {
              const count = stageGroups[stage]?.length ?? 0;
              return (
                <StaggerItem key={stage} style={{ flex: 1 }}>
                  <Box
                    p={4}
                    rounded="lg"
                    display="flex"
                    direction="column"
                    align="center"
                    gap={1}
                    borderColor={count > 0 ? "secondary" : "primary"}
                    bg={count > 0 ? "surface-secondary" : undefined}
                  >
                    <Icon name={config.icon} size="md" tone="secondary" />
                    <AnimatedCounter value={count} style={{ fontSize: 18, fontWeight: 700 }} />
                    <Text variant="body-xs" tone="secondary">{config.label}</Text>
                  </Box>
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
              <FadeIn>
                <Box
                  p={8}
                  display="flex"
                  direction="column"
                  align="center"
                  gap={4}
                  rounded="lg"
                  bg="surface-secondary"
                >
                  <ScaleIn>
                    <Icon name="plant" size="lg" tone="secondary" />
                  </ScaleIn>
                  <Text variant="heading-sm">Your garden is empty!</Text>
                  <Text variant="body-sm" tone="secondary">
                    Practice in Scenario Rooms or Shadow Speaking to plant
                    your first seeds. Or try some demo words!
                  </Text>
                  <HoverLift>
                    <Button variant="primary" size="lg" icon="plant" onClick={addDemoCards}>
                      Plant Demo Seeds
                    </Button>
                  </HoverLift>
                </Box>
              </FadeIn>
            ) : sessionComplete || dueCards.length === 0 ? (
              <FadeIn>
                <Box
                  p={8}
                  display="flex"
                  direction="column"
                  align="center"
                  gap={4}
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
                          ? "linear-gradient(135deg, #58CC02, #46A302)"
                          : "linear-gradient(135deg, #1CB0F6, #0899DB)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={sessionComplete ? "success" : "check"} size="lg" tone="inverse" />
                    </div>
                  </ScaleIn>
                  <FadeIn delay={0.2}>
                    <Text variant="heading-sm">
                      {sessionComplete
                        ? "Review Complete!"
                        : "All caught up!"}
                    </Text>
                  </FadeIn>
                  {sessionComplete && (
                    <FadeIn delay={0.3}>
                      <Text variant="heading-md" tone="positive">
                        +<AnimatedCounter value={sessionXp} /> XP
                      </Text>
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
                    </FadeIn>
                  )}
                </Box>
              </FadeIn>
            ) : (
              currentCard && (
                <Box display="flex" direction="column" gap={4}>
                  <Box display="flex" align="center" gap={3}>
                    <Text variant="label-sm" tone="tertiary">
                      {currentCardIndex + 1} / {dueCards.length}
                    </Text>
                    <div style={{ flex: 1 }}>
                      <ProgressBar
                        percent={((currentCardIndex + 1) / dueCards.length) * 100}
                        color="linear-gradient(90deg, #58CC02, #89E219)"
                        height={8}
                      />
                    </div>
                    <Badge variant={STAGE_CONFIG[currentCard.gardenStage].color} size="sm">
                      {STAGE_CONFIG[currentCard.gardenStage].label}
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
                          <Badge variant={STAGE_CONFIG[currentCard.gardenStage].color}>
                            {STAGE_CONFIG[currentCard.gardenStage].label}
                          </Badge>
                          <Badge variant="default">{currentCard.category}</Badge>
                        </Box>

                        <Text variant="heading-lg">{currentCard.word}</Text>

                        <AnimatePresence mode="wait">
                          {!showAnswer ? (
                            <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => setShowAnswer(true)}
                              >
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
                                <Text variant="body-lg" tone="secondary">
                                  {currentCard.translation}
                                </Text>

                                <Text variant="label-sm" tone="tertiary">
                                  How well did you remember?
                                </Text>
                                <Box display="flex" gap={3}>
                                  {([
                                    { r: 1 as Rating, label: "Forgot", icon: "error" as IconName, color: "#FF4B4B" },
                                    { r: 2 as Rating, label: "Hard", icon: "warning" as IconName, color: "#FFC200" },
                                    { r: 3 as Rating, label: "Good", icon: "check" as IconName, color: "#58CC02" },
                                    { r: 4 as Rating, label: "Easy", icon: "favourite" as IconName, color: "#1CB0F6" },
                                  ]).map((opt) => (
                                    <HoverLift key={opt.r} onClick={() => handleRate(opt.r)}>
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
                    </motion.div>
                  </AnimatePresence>
                </Box>
              )
            )}
          </Box>
        )}

        {tab === "garden" && (
          <StaggerContainer style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {(Object.entries(stageGroups) as [keyof typeof STAGE_CONFIG, FSRSCard[]][]).map(
              ([stage, cards]) =>
                cards.length > 0 && (
                  <StaggerItem key={stage}>
                    <Box display="flex" direction="column" gap={3}>
                      <Box display="flex" align="center" gap={2}>
                        <Icon name={STAGE_CONFIG[stage].icon} size="md" tone="secondary" />
                        <Text variant="heading-sm">{STAGE_CONFIG[stage].label}</Text>
                        <Badge variant={STAGE_CONFIG[stage].color}>
                          {cards.length}
                        </Badge>
                      </Box>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                        {cards.map((card, i) => (
                          <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.8) }}
                            style={{ minWidth: 160 }}
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
                              >
                                <Box display="flex" justify="between" align="center">
                                  <Text variant="label-md">{card.word}</Text>
                                  <Icon name={STAGE_CONFIG[card.gardenStage].icon} size="sm" tone="secondary" />
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
                <FadeIn>
                  <Box p={8} display="flex" direction="column" align="center" gap={4}>
                    <Icon name="plant" size="lg" tone="secondary" />
                    <Text variant="body-md" tone="secondary">
                      No plants yet. Start practicing!
                    </Text>
                    <Button variant="primary" icon="plant" onClick={addDemoCards}>
                      Plant Demo Seeds
                    </Button>
                  </Box>
                </FadeIn>
              </StaggerItem>
            )}
          </StaggerContainer>
        )}
      </Box>
    </div>
  );
}
