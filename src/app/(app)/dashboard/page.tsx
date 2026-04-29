"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Card,
  Header,
  Icon,
  MetricCard,
  Badge,
  Text,
  Stepper,
  OptionGroup,
  OptionItem,
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
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  ScaleIn,
  HoverLift,
  AnimatedCounter,
  ProgressBar,
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

  const todayXp = getTodayXp();
  const dailyProgress = Math.min((todayXp / DAILY_GOAL_XP) * 100, 100);

  useEffect(() => {
    if (!isOnboarded) {
      router.push("/onboarding");
      return;
    }
    updateStreak();
    setMounted(true);
  }, [isOnboarded, router, updateStreak]);

  useEffect(() => {
    if (dailyProgress >= 100 && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => fireConfetti("center"), 500);
    }
  }, [dailyProgress]);

  if (!isOnboarded || !identity || !targetLanguage || !mounted) return null;

  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
  const currentLevel = IDENTITY_LEVELS.findLast((l) => identity.xp >= l.minXp);
  const nextLevel = IDENTITY_LEVELS.find((l) => identity.xp < l.minXp);
  const xpProgress = nextLevel
    ? ((identity.xp - (currentLevel?.minXp ?? 0)) /
        ((nextLevel?.minXp ?? 1) - (currentLevel?.minXp ?? 0))) *
      100
    : 100;

  const seeds = gardenCards.filter((c) => c.gardenStage === "seed").length;
  const sprouts = gardenCards.filter((c) => c.gardenStage === "sprout").length;

  const availableRooms = SCENARIO_ROOMS.filter(
    (r) => r.language === targetLanguage
  );

  const pathComplete = completedLessonCount(foundationLessonIds ?? []);
  const stepperSteps = curriculumStepperSteps();
  const stepperCurrent =
    pathComplete === 0
      ? -1
      : Math.min(pathComplete - 1, stepperSteps.length - 1);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header
        type="main"
        left={{
          title: `${langInfo?.nativeName ?? "Language"} Journey`,
          subtitle: `${identity.name} from ${identity.neighborhood}`,
        }}
      />

      <StaggerContainer style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, overflow: "auto" }}>
        {/* Stat bar */}
        <StaggerItem>
          <Box display="flex" gap={4} align="center" justify="between">
            <div
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/settings")}
            >
              <Box display="flex" align="center" gap={2}>
                <Icon name="activity" size="md" tone="warning" />
                <Box display="flex" direction="column">
                  <AnimatedCounter value={streak} style={{ fontSize: 18, fontWeight: 700 }} />
                  <Text variant="body-xs" tone="secondary">Streak</Text>
                </Box>
              </Box>
            </div>

            <Box display="flex" align="center" gap={2}>
              <Icon name="ai-magic" size="md" tone="brand" />
              <Box display="flex" direction="column">
                <AnimatedCounter value={identity.xp} style={{ fontSize: 18, fontWeight: 700 }} />
                <Text variant="body-xs" tone="secondary">Total XP</Text>
              </Box>
            </Box>

            <Box display="flex" align="center" gap={2}>
              <Icon name="layers" size="md" tone="secondary" />
              <Box display="flex" direction="column">
                <Text variant="heading-sm">{currentLevel?.name ?? "Newcomer"}</Text>
                <Text variant="body-xs" tone="secondary">Level {currentLevel?.level ?? 1}</Text>
              </Box>
            </Box>

            <Box display="flex" align="center" gap={2}>
              <Icon name="plant" size="md" tone="success" />
              <Box display="flex" direction="column">
                <AnimatedCounter value={gardenCards.length} style={{ fontSize: 18, fontWeight: 700 }} />
                <Text variant="body-xs" tone="secondary">Words</Text>
              </Box>
            </Box>
          </Box>
        </StaggerItem>

        {/* Daily Goal */}
        <StaggerItem>
          <Box
            p={5}
            rounded="lg"
            bg="surface-secondary"
            display="flex"
            direction="column"
            gap={3}
          >
            <Box display="flex" justify="between" align="center">
              <Box display="flex" align="center" gap={2}>
                <Icon name="favourite" size="sm" tone="brand" />
                <Text variant="label-md">Daily Goal</Text>
              </Box>
              <Text variant="body-sm" tone="secondary">
                {todayXp} / {DAILY_GOAL_XP} XP
              </Text>
            </Box>
            <ProgressBar
              percent={dailyProgress}
              color="linear-gradient(90deg, #58CC02, #89E219)"
              height={12}
            />
            {dailyProgress >= 100 && (
              <FadeIn>
                <Box display="flex" align="center" gap={2}>
                  <Icon name="success" size="sm" tone="success" />
                  <Text variant="body-sm" tone="positive">
                    Daily goal reached! Keep going!
                  </Text>
                </Box>
              </FadeIn>
            )}
          </Box>
        </StaggerItem>

        {/* Level progress */}
        {nextLevel && (
          <StaggerItem>
            <Box
              p={5}
              rounded="lg"
              bg="surface-secondary"
              display="flex"
              direction="column"
              gap={3}
            >
              <Box display="flex" justify="between" align="center">
                <Box display="flex" align="center" gap={2}>
                  <Icon name="layers" size="sm" tone="warning" />
                  <Text variant="label-md">
                    {currentLevel?.name ?? "Newcomer"} → {nextLevel.name}
                  </Text>
                </Box>
                <Badge variant="brand">{identity.xp} / {nextLevel.minXp} XP</Badge>
              </Box>
              <ProgressBar
                percent={Math.min(xpProgress, 100)}
                color="linear-gradient(90deg, #FFC200, #F49000)"
                height={12}
              />
            </Box>
          </StaggerItem>
        )}

        {/* Foundation path */}
        <StaggerItem>
          <Box display="flex" direction="column" gap={4}>
            <Text variant="heading-sm">Foundation path</Text>
            <Text variant="body-sm" tone="secondary">
              Four quick wins — about 15 minutes total — to get listening, speaking,
              role-play, and review on your radar.
            </Text>
            <Stepper steps={stepperSteps} currentStep={stepperCurrent} />

            <Box display="flex" gap={4} wrap="wrap">
              <Box grow minW="0">
                <MetricCard
                  heading="Path progress"
                  value={`${pathComplete}/${stepperSteps.length}`}
                  tooltipContent="Starter lessons completed"
                />
              </Box>
              <Box grow minW="0">
                <MetricCard
                  heading="Milestones"
                  value={`${milestonesUnlocked}/${MILESTONE_DEFS.length}`}
                  tooltipContent="Badges earned on your journey"
                />
              </Box>
            </Box>

            {nextLesson ? (
              <Card
                heading={`Next: ${nextLesson.title}`}
                description={nextLesson.description}
                badge={{ value: "Continue", variant: "brand" }}
                onClick={() => router.push(continueHref)}
              />
            ) : (
              <Card
                heading="Foundation path complete"
                description="Pick any scenario, shadow harder phrases, or grow your garden."
                badge={{ value: "Done", variant: "green" }}
                onClick={() => router.push("/scenario-rooms")}
              />
            )}
          </Box>
        </StaggerItem>

        {/* Milestones */}
        <StaggerItem>
          <Box display="flex" direction="column" gap={3}>
            <Text variant="heading-sm">Milestones</Text>
            <OptionGroup>
              {MILESTONE_DEFS.map((m) => {
                const earned = Boolean(foundationMilestoneAt?.[m.id]);
                return (
                  <OptionItem
                    key={m.id}
                    label={m.title}
                    description={m.description}
                    badge={
                      earned
                        ? { value: "Earned", variant: "green" }
                        : { value: "Locked", variant: "default" }
                    }
                  />
                );
              })}
            </OptionGroup>
          </Box>
        </StaggerItem>

        {/* Full Curriculum Progress */}
        <StaggerItem>
          <Box display="flex" direction="column" gap={4}>
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

            <Box
              p={5}
              rounded="lg"
              bg="surface-secondary"
              display="flex"
              direction="column"
              gap={3}
            >
              <Box display="flex" align="center" gap={4}>
                <div
                  style={{
                    position: "relative",
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                  }}
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--tatva-border-secondary, #E5E5E5)" strokeWidth="4" />
                    <motion.circle
                      cx="24" cy="24" r="20" fill="none"
                      stroke="#58CC02" strokeWidth="4"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "0 125.7" }}
                      animate={{ strokeDasharray: `${curriculumPercent * 1.257} 125.7` }}
                      transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                    />
                  </svg>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AnimatedCounter value={curriculumPercent} suffix="%" style={{ fontSize: 13, fontWeight: 600 }} />
                  </div>
                </div>
                <Box display="flex" direction="column" gap={1} grow>
                  <Text variant="label-md">
                    {completedCurriculumLessons} of {totalCurriculumLessons} lessons
                  </Text>
                  <ProgressBar
                    percent={curriculumPercent}
                    color="linear-gradient(90deg, #1CB0F6, #58CC02)"
                    height={8}
                  />
                </Box>
              </Box>

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

              {nextCurriculumLesson && (
                <HoverLift onClick={() => {
                  const l = nextCurriculumLesson.lesson;
                  if (l.type === "scenario" && l.linkedScenarioId) {
                    router.push(`/scenario-rooms/${l.linkedScenarioId}`);
                  } else {
                    router.push(`/learning-path/lesson/${l.id}`);
                  }
                }}>
                  <div
                    style={{
                      border: "1px solid var(--tatva-border-primary, #333)",
                      borderRadius: "var(--tatva-radius-md, 12px)",
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Icon
                      name={LESSON_TYPE_ICON[nextCurriculumLesson.lesson.type] ?? "docs"}
                      size="sm"
                      tone="brand"
                    />
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
                  </div>
                </HoverLift>
              )}
            </Box>
          </Box>
        </StaggerItem>

        {/* Quick Actions */}
        <StaggerItem>
          <Box display="flex" direction="column" gap={3}>
            <Text variant="heading-sm">Continue Learning</Text>

            <ScaleIn delay={0.1}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #58CC02 0%, #46A302 100%)",
                  borderRadius: "var(--tatva-radius-lg, 20px)",
                  padding: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
                onClick={() => router.push(continueHref)}
              >
                <Icon name="chat" size="lg" tone="inverse" />
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>
                    {nextLesson ? nextLesson.title : "Scenario rooms"}
                  </span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>
                    {nextLesson
                      ? nextLesson.description
                      : "Immersive role-play in real Indian situations"}
                  </span>
                </div>
                <Icon name="arrow-right" size="md" tone="inverse" />
              </motion.div>
            </ScaleIn>

            <div className="grid grid-cols-3 gap-tatva-4">
              {[
                { href: "/eavesdrop", icon: "audio-book" as const, tone: "brand" as const, label: "Eavesdrop", desc: "Listen & absorb", badge: "5 min", badgeV: "brand" as const },
                { href: "/shadow-speaking", icon: "microphone" as const, tone: "indigo" as const, label: "Shadow", desc: "Match pronunciation", badge: "5 min", badgeV: "indigo" as const },
                { href: "/garden", icon: "plant" as const, tone: "success" as const, label: "Garden", desc: "Review words", badge: seeds + sprouts > 0 ? `${seeds + sprouts} due` : "All good", badgeV: (seeds + sprouts > 0 ? "yellow" : "green") as "yellow" | "green" },
              ].map((item, i) => (
                <HoverLift key={item.href} onClick={() => router.push(item.href)}>
                  <Box
                    p={5}
                    rounded="lg"
                    bg="surface-secondary"
                    borderColor="primary"
                    display="flex"
                    direction="column"
                    align="center"
                    gap={3}
                  >
                    <Icon name={item.icon} size="lg" tone={item.tone} />
                    <Text variant="label-md">{item.label}</Text>
                    <Text variant="body-xs" tone="secondary">{item.desc}</Text>
                    <Badge variant={item.badgeV}>{item.badge}</Badge>
                  </Box>
                </HoverLift>
              ))}
            </div>
          </Box>
        </StaggerItem>

        {/* Scenario rooms */}
        {availableRooms.length > 0 && (
          <StaggerItem>
            <Box display="flex" direction="column" gap={3}>
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

              <div className="grid grid-cols-2 gap-tatva-4">
                {availableRooms.slice(0, 4).map((room) => {
                  const result = scenarioResults.find(
                    (r) => r.roomId === room.id
                  );
                  return (
                    <HoverLift
                      key={room.id}
                      onClick={() => router.push(`/scenario-rooms/${room.id}`)}
                    >
                      <Box
                        p={4}
                        rounded="lg"
                        borderColor="primary"
                        display="flex"
                        align="center"
                        gap={3}
                      >
                        <LangBadge code={room.language} size="sm" />
                        <Box display="flex" direction="column" gap={1} grow minW="0">
                          <Text variant="label-md">{room.title}</Text>
                          <Text variant="body-xs" tone="secondary" lineClamp={1}>
                            {room.description}
                          </Text>
                        </Box>
                        {result ? (
                          <Text variant="body-sm" tone="warning">
                            {"★".repeat(result.stars)}{"☆".repeat(3 - result.stars)}
                          </Text>
                        ) : (
                          <Badge variant="default">{room.difficulty}</Badge>
                        )}
                      </Box>
                    </HoverLift>
                  );
                })}
              </div>
            </Box>
          </StaggerItem>
        )}
      </StaggerContainer>
    </div>
  );
}
