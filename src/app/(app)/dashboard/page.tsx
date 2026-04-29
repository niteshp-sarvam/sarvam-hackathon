"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Badge,
  Header,
  Icon,
  MetricCard,
  Skeleton,
  Text,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SCENARIO_ROOMS, IDENTITY_LEVELS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import {
  curriculumStepperSteps,
  getNextLesson,
  completedLessonCount,
  MILESTONE_DEFS,
} from "@/lib/foundation-path";
import {
  getCurriculum,
  computeLessonStatuses,
  getUnitProgress,
} from "@/lib/curriculum";
import LangBadge from "@/components/LangBadge";
import { GAME_COLORS, GAME_GRADIENTS, SURFACE_VARS } from "@/lib/theme-tokens";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  ScaleIn,
  HoverLift,
  AnimatedCounter,
  ProgressBar,
  CountUpRing,
  ShimmerBorder,
  Wiggle,
  SlideUpReveal,
  fireConfetti,
  motion,
} from "@/components/motion";

const DAILY_GOAL_XP = 50;

const LESSON_TYPE_ICON: Record<string, Parameters<typeof Icon>[0]["name"]> = {
  vocab: "docs",
  listen: "audio-book",
  speak: "microphone",
  scenario: "chat",
};

function getTimeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Late night learning";
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    isOnboarded,
    identity,
    targetLanguage,
    streak,
    gardenCards,
    scenarioResults,
    updateStreak,
    foundationLessonIds,
    foundationMilestoneAt,
    lessonProgress,
    getTodayXp,
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const confettiFired = useRef(false);
  const initialProgress = useRef<number | null>(null);

  const todayXp = getTodayXp();
  const dailyProgress = Math.min((todayXp / DAILY_GOAL_XP) * 100, 100);

  useEffect(() => {
    if (!isOnboarded) {
      router.push("/onboarding");
      return;
    }
    updateStreak();
    initialProgress.current = Math.min((getTodayXp() / DAILY_GOAL_XP) * 100, 100);
    setMounted(true);
  }, [isOnboarded, router, updateStreak, getTodayXp]);

  useEffect(() => {
    if (
      dailyProgress >= 100 &&
      !confettiFired.current &&
      initialProgress.current !== null &&
      initialProgress.current < 100
    ) {
      confettiFired.current = true;
      setTimeout(() => fireConfetti("center"), 500);
    }
  }, [dailyProgress]);

  if (!isOnboarded || !identity || !targetLanguage || !mounted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Header type="main" left={{ title: "Dashboard" }} />
        <Box display="flex" direction="column" gap={6} p={6}>
          <Box display="flex" gap={4}>
            <Skeleton height={80} width="33%" />
            <Skeleton height={80} width="33%" />
            <Skeleton height={80} width="33%" />
          </Box>
          <Skeleton height={200} />
          <Skeleton height={160} />
        </Box>
      </div>
    );
  }

  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
  const currentLevel = IDENTITY_LEVELS.findLast((l) => identity.xp >= l.minXp);
  const nextLevel = IDENTITY_LEVELS.find((l) => identity.xp < l.minXp);
  const xpProgress = (() => {
    if (!nextLevel) return 100;
    const span = (nextLevel.minXp ?? 0) - (currentLevel?.minXp ?? 0);
    if (span <= 0) return 0;
    const earned = identity.xp - (currentLevel?.minXp ?? 0);
    return Math.max(0, Math.min(100, (earned / span) * 100));
  })();

  const seeds = gardenCards.filter((c) => c.gardenStage === "seed").length;
  const sprouts = gardenCards.filter((c) => c.gardenStage === "sprout").length;
  const dueWords = seeds + sprouts;

  const availableRooms = SCENARIO_ROOMS.filter(
    (r) => r.language === targetLanguage
  );

  const pathComplete = completedLessonCount(foundationLessonIds ?? []);
  const stepperSteps = curriculumStepperSteps();
  const nextLesson = getNextLesson(foundationLessonIds ?? []);
  const milestonesUnlocked = MILESTONE_DEFS.filter(
    (m) => foundationMilestoneAt?.[m.id]
  ).length;

  const continueHref =
    nextLesson?.route === "/scenario-rooms" && availableRooms.length > 0
      ? `/scenario-rooms/${availableRooms[0].id}`
      : (nextLesson?.route ?? "/scenario-rooms");

  const curriculum = targetLanguage ? getCurriculum(targetLanguage) : [];
  const lessonStatuses = targetLanguage
    ? computeLessonStatuses(targetLanguage, lessonProgress)
    : {};
  const totalCurriculumLessons = curriculum.flatMap((u) => u.lessons).length;
  const completedCurriculumLessons = Object.values(lessonProgress).filter(
    (p) => p.status === "completed"
  ).length;
  const curriculumPercent =
    totalCurriculumLessons > 0
      ? Math.round((completedCurriculumLessons / totalCurriculumLessons) * 100)
      : 0;

  const nextCurriculumLesson = (() => {
    for (const unit of curriculum) {
      for (const lesson of unit.lessons) {
        const st = lessonStatuses[lesson.id];
        if (st === "started" || st === "available") {
          return { unit, lesson };
        }
      }
    }
    return null;
  })();

  const activeUnit = nextCurriculumLesson
    ? curriculum.find((u) => u.id === nextCurriculumLesson.unit.id)
    : curriculum[0];
  const activeUnitProgress = activeUnit
    ? getUnitProgress(activeUnit, lessonProgress)
    : null;

  const greeting = getTimeOfDayGreeting();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header
        type="main"
        left={{
          title: `${langInfo?.nativeName ?? "Language"} Journey`,
        }}
      />

      <StaggerContainer
        style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1, overflow: "auto", padding: "16px 4px 32px" }}
      >
        {/* ============ HERO ZONE ============ */}
        <StaggerItem>
          <Box display="flex" direction="column" gap={6}>
            {/* Greeting row */}
            <Box display="flex" align="center" justify="between">
              <Box display="flex" align="center" gap={6}>
                <LangBadge code={targetLanguage} size="lg" />
                <Box display="flex" direction="column" gap={1}>
                  <Text variant="heading-md">
                    {greeting}, {identity.name}!
                  </Text>
                  <Text variant="body-sm" tone="secondary">
                    {[identity.neighborhood, currentLevel?.name ?? "Newcomer"]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </Box>
              </Box>

              {/* Daily goal ring */}
              <HoverLift onClick={() => router.push("/settings")}>
                <Box display="flex" align="center" gap={3}>
                  <CountUpRing
                    percent={dailyProgress}
                    size={52}
                    strokeWidth={4}
                    color={dailyProgress >= 100 ? GAME_COLORS.success : GAME_COLORS.warning}
                  >
                    <AnimatedCounter
                      value={todayXp}
                      style={{ fontSize: 13, fontWeight: 700, color: dailyProgress >= 100 ? GAME_COLORS.success : GAME_COLORS.warning }}
                    />
                  </CountUpRing>
                  <Box display="flex" direction="column">
                    <Text variant="label-md">
                      {dailyProgress >= 100 ? "Goal hit!" : `${todayXp}/${DAILY_GOAL_XP}`}
                    </Text>
                    <Text variant="body-xs" tone="secondary">Daily XP</Text>
                  </Box>
                </Box>
              </HoverLift>
            </Box>

            {dailyProgress >= 100 && (
              <FadeIn>
                <Box display="flex" align="center" gap={2} p={3} rounded="md" style={{ background: "rgba(88, 204, 2, 0.08)", border: "1px solid rgba(88, 204, 2, 0.2)" }}>
                  <Icon name="success" size="sm" tone="success" />
                  <Text variant="body-sm" tone="positive">
                    Daily goal reached! Keep the momentum going.
                  </Text>
                </Box>
              </FadeIn>
            )}

            {/* Primary CTA */}
            <ScaleIn delay={0.15}>
              <ShimmerBorder borderRadius={20}>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    cursor: "pointer",
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(79, 70, 229, 0.12) 100%)",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                    borderRadius: 19,
                    padding: "24px 28px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                  onClick={() => router.push(continueHref)}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                  >
                    <Icon name="chat" size="lg" tone="brand" />
                  </motion.div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                    <Box display="flex" align="center" gap={2}>
                      <Badge variant="brand" size="sm">
                        Today&apos;s quest
                      </Badge>
                      <Text variant="body-xs" tone="tertiary">
                        Resets at midnight
                      </Text>
                    </Box>
                    <span style={{ fontSize: 18, fontWeight: 700, color: SURFACE_VARS.contentPrimary }}>
                      {nextLesson ? `Continue: ${nextLesson.title}` : "Explore Scenario Rooms"}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--tatva-content-secondary, rgba(255,255,255,0.65))" }}>
                      {nextLesson
                        ? nextLesson.description
                        : "Immersive role-play in real Indian situations"}
                    </span>
                  </div>
                  <Box display="flex" align="center" gap={2}>
                    {nextCurriculumLesson && (
                      <Badge variant="indigo">+{nextCurriculumLesson.lesson.xpReward} XP</Badge>
                    )}
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Icon name="arrow-right" size="md" tone="brand" />
                    </motion.div>
                  </Box>
                </motion.div>
              </ShimmerBorder>
            </ScaleIn>
          </Box>
        </StaggerItem>

        {/* ============ STATS ZONE ============ */}
        <StaggerItem>
          <div className="grid grid-cols-4 gap-tatva-4" style={{ alignItems: "stretch" }}>
            {([
              {
                heading: "Streak",
                value: `${streak} day${streak !== 1 ? "s" : ""}`,
                tooltip: "Keep learning daily to grow your streak",
                icon: "activity" as const,
                iconTone: "warning" as const,
                onClick: undefined as (() => void) | undefined,
                extra: streak > 0 && streak < 3 ? "wiggle" : undefined,
              },
              {
                heading: "Total XP",
                value: identity.xp.toLocaleString(),
                tooltip: "Experience points earned across all activities",
                icon: "ai-magic" as const,
                iconTone: "brand" as const,
                onClick: undefined as (() => void) | undefined,
                extra: undefined,
              },
              {
                heading: "Level",
                value: currentLevel?.name ?? "Newcomer",
                tooltip: nextLevel ? `${identity.xp}/${nextLevel.minXp} XP to ${nextLevel.name}` : "Max level reached!",
                icon: "layers" as const,
                iconTone: "secondary" as const,
                onClick: undefined as (() => void) | undefined,
                extra: nextLevel ? "levelbar" : undefined,
              },
              {
                heading: "Garden",
                value: `${gardenCards.length} word${gardenCards.length !== 1 ? "s" : ""}`,
                tooltip: dueWords > 0 ? `${dueWords} words need review!` : "All words are growing nicely",
                icon: "plant" as const,
                iconTone: "success" as const,
                onClick: () => router.push("/garden"),
                extra: dueWords > 0 ? "due" : undefined,
              },
            ] as const).map((card) => (
              <HoverLift key={card.heading} onClick={card.onClick}>
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
                    <Text variant="body-xs" tone="secondary">{card.heading}</Text>
                    <Icon name={card.icon} size="sm" tone={card.iconTone} />
                  </Box>
                  <Text variant="heading-sm">{card.value}</Text>
                  {card.extra === "levelbar" && nextLevel && (
                    <ProgressBar
                      percent={Math.min(xpProgress, 100)}
                      color={GAME_GRADIENTS.warningSoft}
                      height={5}
                    />
                  )}
                  {card.extra === "due" && (
                    <Badge variant="yellow">{dueWords} due</Badge>
                  )}
                  {card.extra === "wiggle" && (
                    <Wiggle active>
                      <Text variant="body-xs" tone="warning">Keep it going!</Text>
                    </Wiggle>
                  )}
                </Box>
              </HoverLift>
            ))}
          </div>
        </StaggerItem>

        {/* ============ CURRICULUM PROGRESS ============ */}
        <StaggerItem>
          <Box
            p={6}
            rounded="lg"
            bg="surface-secondary"
            display="flex"
            direction="column"
            gap={5}
          >
            <Box display="flex" justify="between" align="center">
              <Text variant="heading-sm">Learning Path</Text>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/learning-path")}
              >
                View full path
              </Button>
            </Box>

            <Box display="flex" align="center" gap={6}>
              <CountUpRing
                percent={curriculumPercent}
                size={64}
                strokeWidth={5}
                color={GAME_COLORS.info}
                delay={0.4}
              >
                <AnimatedCounter
                  value={curriculumPercent}
                  suffix="%"
                  style={{ fontSize: 14, fontWeight: 700 }}
                />
              </CountUpRing>

              <Box display="flex" direction="column" gap={2} grow>
                <Text variant="label-md">
                  {completedCurriculumLessons} of {totalCurriculumLessons} lessons completed
                </Text>
                <ProgressBar
                  percent={curriculumPercent}
                  color={GAME_GRADIENTS.brand}
                  height={8}
                />
                {activeUnit && activeUnitProgress && (
                  <Box display="flex" align="center" gap={2}>
                    <Icon name={activeUnit.icon as Parameters<typeof Icon>[0]["name"]} size="sm" tone="secondary" />
                    <Text variant="body-xs" tone="secondary">
                      Current: {activeUnit.title}
                    </Text>
                    <Badge variant="brand">
                      {activeUnitProgress.completed}/{activeUnitProgress.total}
                    </Badge>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Next lesson card */}
            {nextCurriculumLesson && (
              <HoverLift onClick={() => {
                const l = nextCurriculumLesson.lesson;
                if (l.type === "scenario" && l.linkedScenarioId) {
                  router.push(`/scenario-rooms/${l.linkedScenarioId}`);
                } else {
                  router.push(`/learning-path/lesson/${l.id}`);
                }
              }}>
                <Box
                  p={4}
                  rounded="md"
                  borderColor="primary"
                  display="flex"
                  align="center"
                  gap={4}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Icon
                      name={LESSON_TYPE_ICON[nextCurriculumLesson.lesson.type] ?? "docs"}
                      size="md"
                      tone="brand"
                    />
                  </motion.div>
                  <Box display="flex" direction="column" gap={0} grow>
                    <Text variant="label-md">
                      {nextCurriculumLesson.lesson.title}
                    </Text>
                    <Text variant="body-xs" tone="secondary">
                      {nextCurriculumLesson.lesson.description}
                    </Text>
                  </Box>
                  <Badge variant="brand">
                    +{nextCurriculumLesson.lesson.xpReward} XP
                  </Badge>
                </Box>
              </HoverLift>
            )}

            {/* Foundation path mini-summary */}
            <Box display="flex" gap={4}>
              <Box
                p={3}
                rounded="md"
                grow
                display="flex"
                align="center"
                gap={3}
                style={{ background: "var(--tatva-background-primary, rgba(255,255,255,0.03))" }}
              >
                <Icon name="shuffle" size="sm" tone="secondary" />
                <Box display="flex" direction="column">
                  <Text variant="label-md">{pathComplete}/{stepperSteps.length}</Text>
                  <Text variant="body-xs" tone="secondary">Foundation</Text>
                </Box>
              </Box>
              <Box
                p={3}
                rounded="md"
                grow
                display="flex"
                align="center"
                gap={3}
                style={{ background: "var(--tatva-background-primary, rgba(255,255,255,0.03))" }}
              >
                <Icon name="favourite" size="sm" tone="warning" />
                <Box display="flex" direction="column">
                  <Text variant="label-md">{milestonesUnlocked}/{MILESTONE_DEFS.length}</Text>
                  <Text variant="body-xs" tone="secondary">Milestones</Text>
                </Box>
              </Box>
            </Box>
          </Box>
        </StaggerItem>

        {/* ============ QUICK ACTIONS ============ */}
        <SlideUpReveal>
          <Box display="flex" direction="column" gap={4}>
            <Text variant="heading-sm">Practice</Text>
            <div className="grid grid-cols-3 gap-tatva-4">
              {([
                {
                  href: "/eavesdrop",
                  icon: "audio-book" as const,
                  label: "Eavesdrop",
                  desc: "Listen & absorb real conversations",
                  gradient: "linear-gradient(135deg, rgba(28, 176, 246, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)",
                  borderColor: "rgba(28, 176, 246, 0.2)",
                  iconTone: "brand" as const,
                  badge: "5 min",
                  badgeV: "brand" as const,
                },
                {
                  href: "/shadow-speaking",
                  icon: "microphone" as const,
                  label: "Shadow Speaking",
                  desc: "Match native pronunciation",
                  gradient: "linear-gradient(135deg, rgba(206, 130, 255, 0.12) 0%, rgba(28, 176, 246, 0.08) 100%)",
                  borderColor: "rgba(206, 130, 255, 0.2)",
                  iconTone: "brand" as const,
                  badge: "5 min",
                  badgeV: "indigo" as const,
                },
                {
                  href: "/garden",
                  icon: "plant" as const,
                  label: "Word Garden",
                  desc: "Review & grow vocabulary",
                  gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.10) 0%, rgba(88, 204, 2, 0.08) 100%)",
                  borderColor: "rgba(245, 158, 11, 0.2)",
                  iconTone: "success" as const,
                  badge: dueWords > 0 ? `${dueWords} due` : "All good",
                  badgeV: (dueWords > 0 ? "yellow" : "green") as "yellow" | "green",
                },
              ]).map((item, i) => (
                <ScaleIn key={item.href} delay={0.1 + i * 0.08}>
                  <HoverLift onClick={() => router.push(item.href)}>
                    <Box
                      p={6}
                      rounded="lg"
                      display="flex"
                      direction="column"
                      align="center"
                      gap={4}
                      style={{
                        background: item.gradient,
                        border: `1px solid ${item.borderColor}`,
                        minHeight: 160,
                        justifyContent: "center",
                      }}
                    >
                      <motion.div
                        whileHover={{ rotate: [0, -8, 8, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        <Icon name={item.icon} size="lg" tone={item.iconTone} />
                      </motion.div>
                      <Text variant="label-md">{item.label}</Text>
                      <Text variant="body-xs" tone="secondary" style={{ textAlign: "center" }}>
                        {item.desc}
                      </Text>
                      <Badge variant={item.badgeV}>{item.badge}</Badge>
                    </Box>
                  </HoverLift>
                </ScaleIn>
              ))}
            </div>
          </Box>
        </SlideUpReveal>

        {/* ============ SCENARIO ROOMS ============ */}
        {availableRooms.length > 0 && (
          <SlideUpReveal>
            <Box display="flex" direction="column" gap={4}>
              <Box display="flex" justify="between" align="center">
                <Text variant="heading-sm">Scenario Rooms</Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/scenario-rooms")}
                >
                  See all
                </Button>
              </Box>

              <div className="scroll-row" style={{ paddingLeft: 2, paddingRight: 2 }}>
                {availableRooms.slice(0, 6).map((room, i) => {
                  const result = scenarioResults.find(
                    (r) => r.roomId === room.id
                  );
                  return (
                    <ScaleIn key={room.id} delay={0.05 * i}>
                      <motion.div
                        whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          cursor: "pointer",
                          minWidth: 220,
                          maxWidth: 260,
                          borderRadius: "var(--tatva-radius-lg, 20px)",
                          border: `1px solid ${SURFACE_VARS.borderPrimary}`,
                          padding: 16,
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          background: "var(--tatva-surface-secondary, rgba(255,255,255,0.03))",
                          transition: "box-shadow 0.2s ease",
                        }}
                        onClick={() => router.push(`/scenario-rooms/${room.id}`)}
                      >
                        <Box display="flex" align="center" gap={3}>
                          <LangBadge code={room.language} size="sm" />
                          <Box display="flex" direction="column" gap={0} grow minW="0">
                            <Text variant="label-md" lineClamp={1}>{room.title}</Text>
                          </Box>
                        </Box>
                        <Text variant="body-xs" tone="secondary" lineClamp={2}>
                          {room.description}
                        </Text>
                        <Box display="flex" align="center" justify="between">
                          <Badge variant="default">
                            {room.difficulty.charAt(0).toUpperCase() +
                              room.difficulty.slice(1)}
                          </Badge>
                          {result ? (
                            <Text variant="body-sm" tone="warning">
                              {"★".repeat(result.stars)}{"☆".repeat(3 - result.stars)}
                            </Text>
                          ) : (
                            <Text variant="body-xs" tone="tertiary">Not tried</Text>
                          )}
                        </Box>
                      </motion.div>
                    </ScaleIn>
                  );
                })}
              </div>
            </Box>
          </SlideUpReveal>
        )}

        {/* ============ MILESTONES ============ */}
        <SlideUpReveal>
          <Box display="flex" direction="column" gap={4}>
            <Text variant="heading-sm">Milestones</Text>
            <div className="scroll-row" style={{ paddingLeft: 2, paddingRight: 2 }}>
              {MILESTONE_DEFS.map((m, i) => {
                const earned = Boolean(foundationMilestoneAt?.[m.id]);
                return (
                  <ScaleIn key={m.id} delay={0.04 * i}>
                    <motion.div
                      whileHover={{ y: -3, scale: 1.04 }}
                      style={{
                        minWidth: 130,
                        padding: "16px 14px",
                        borderRadius: "var(--tatva-radius-lg, 20px)",
                        border: earned
                          ? "1.5px solid rgba(245, 158, 11, 0.4)"
                          : `1px solid ${SURFACE_VARS.borderSecondary}`,
                        background: earned
                          ? "rgba(245, 158, 11, 0.06)"
                          : "var(--tatva-surface-secondary, rgba(255,255,255,0.02))",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        cursor: "default",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          background: earned
                            ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(251, 191, 36, 0.15))"
                            : "rgba(128,128,128,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          filter: earned ? "none" : "grayscale(1)",
                          opacity: earned ? 1 : 0.4,
                        }}
                      >
                        {earned ? (
                          <Icon name="favourite" size="md" tone="warning" />
                        ) : (
                          <Icon name="eye-off" size="sm" tone="secondary" />
                        )}
                      </div>
                      <Text
                        variant="label-md"
                        style={{
                          textAlign: "center",
                          fontSize: 12,
                          opacity: earned ? 1 : 0.5,
                        }}
                      >
                        {m.title}
                      </Text>
                      {earned && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Badge variant="yellow">Earned</Badge>
                        </motion.div>
                      )}
                    </motion.div>
                  </ScaleIn>
                );
              })}
            </div>
          </Box>
        </SlideUpReveal>
      </StaggerContainer>
    </div>
  );
}
