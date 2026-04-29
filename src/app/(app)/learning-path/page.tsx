"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
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
import {
  getCurriculum,
  computeLessonStatuses,
  getUnitProgress,
  isUnitCompleted,
  MILESTONES,
  type LessonStatus,
  type Unit,
  type Lesson,
} from "@/lib/curriculum";
import type { MilestoneContext } from "@/lib/curriculum";
import { SUPPORTED_LANGUAGES, IDENTITY_LEVELS } from "@/lib/constants";
import {
  StaggerContainer,
  StaggerItem,
  PulseRing,
  AnimatePresence,
  motion,
} from "@/components/motion";

type IconName = Parameters<typeof Icon>[0]["name"];

const TYPE_CONFIG: Record<string, { icon: IconName; label: string; gradient: string }> = {
  vocab: { icon: "docs", label: "Vocabulary", gradient: "linear-gradient(135deg, #58CC02, #46A302)" },
  listen: { icon: "audio-book", label: "Listening", gradient: "linear-gradient(135deg, #1CB0F6, #0899DB)" },
  speak: { icon: "microphone", label: "Speaking", gradient: "linear-gradient(135deg, #FF9600, #E68600)" },
  scenario: { icon: "chat", label: "Scenario", gradient: "linear-gradient(135deg, #CE82FF, #A855F7)" },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: "#58CC02",
  intermediate: "#FFC200",
  advanced: "#FF4B4B",
};

export default function LearningPathPage() {
  const router = useRouter();
  const {
    isOnboarded,
    identity,
    targetLanguage,
    gardenCards,
    scenarioResults,
    streak,
    lessonProgress,
    unlockedMilestones,
    startLesson,
    unlockMilestone,
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [tab, setTab] = useState("path");

  useEffect(() => {
    if (!isOnboarded) {
      router.push("/onboarding");
      return;
    }
    setMounted(true);
  }, [isOnboarded, router]);

  const curriculum = useMemo(
    () => (targetLanguage ? getCurriculum(targetLanguage) : []),
    [targetLanguage]
  );

  const lessonStatuses = useMemo(
    () =>
      targetLanguage
        ? computeLessonStatuses(targetLanguage, lessonProgress)
        : {},
    [targetLanguage, lessonProgress]
  );

  const milestoneCtx: MilestoneContext = useMemo(() => {
    const completedLessons = Object.entries(lessonProgress)
      .filter(([, v]) => v.status === "completed")
      .map(([k]) => k);
    const completedUnits = curriculum
      .filter((u) => isUnitCompleted(u, lessonProgress))
      .map((u) => u.id);
    const scenarioStars: Record<string, number> = {};
    scenarioResults.forEach((r) => {
      scenarioStars[r.roomId] = Math.max(scenarioStars[r.roomId] ?? 0, r.stars);
    });
    return {
      completedLessons,
      completedUnits,
      streak,
      totalXp: identity?.xp ?? 0,
      gardenCards,
      scenarioStars,
      totalScenariosCompleted: scenarioResults.length,
    };
  }, [lessonProgress, curriculum, scenarioResults, streak, identity, gardenCards]);

  const checkMilestones = useCallback(() => {
    MILESTONES.forEach((m) => {
      if (!unlockedMilestones.includes(m.id) && m.check(milestoneCtx)) {
        unlockMilestone(m.id);
      }
    });
  }, [milestoneCtx, unlockedMilestones, unlockMilestone]);

  useEffect(() => {
    if (mounted) checkMilestones();
  }, [mounted, checkMilestones]);

  if (!isOnboarded || !identity || !targetLanguage || !mounted) return null;

  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);
  const currentLevel = IDENTITY_LEVELS.findLast((l) => identity.xp >= l.minXp);
  const totalLessons = curriculum.flatMap((u) => u.lessons).length;
  const completedCount = Object.values(lessonProgress).filter(
    (p) => p.status === "completed"
  ).length;
  const overallPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const completedUnitCount = curriculum.filter((u) =>
    isUnitCompleted(u, lessonProgress)
  ).length;

  function handleLessonClick(lesson: Lesson, status: LessonStatus) {
    if (status === "locked") return;
    if (lesson.type === "scenario" && lesson.linkedScenarioId) {
      startLesson(lesson.id);
      router.push(`/scenario-rooms/${lesson.linkedScenarioId}`);
      return;
    }
    if (status === "available" || status === "started") {
      startLesson(lesson.id);
      router.push(`/learning-path/lesson/${lesson.id}`);
      return;
    }
    setActiveLesson(activeLesson === lesson.id ? null : lesson.id);
  }

  function renderLessonNode(
    lesson: Lesson,
    status: LessonStatus,
    index: number,
    isLast: boolean
  ) {
    const config = TYPE_CONFIG[lesson.type];
    const isActive = activeLesson === lesson.id;
    const isCompleted = status === "completed";
    const isLocked = status === "locked";
    const isAvailable = status === "available" || status === "started";

    return (
      <div key={lesson.id} style={{ display: "flex", gap: 16, position: "relative" }}>
        {/* Timeline line */}
        {!isLast && (
          <div
            style={{
              position: "absolute",
              left: 19,
              top: 40,
              bottom: -8,
              width: 2,
              background: isCompleted
                ? "#58CC02"
                : "var(--tatva-border-secondary, #E5E5E5)",
            }}
          />
        )}

        {/* Node circle */}
        <PulseRing active={isAvailable && !isCompleted} color="rgba(88, 204, 2, 0.4)">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            background: isCompleted
              ? config.gradient
              : isAvailable
              ? "var(--tatva-surface-secondary, #fff)"
              : "var(--tatva-background-tertiary, #F3F3F3)",
            border: isAvailable
              ? `2px solid ${DIFFICULTY_COLOR[lesson.type === "scenario" ? "advanced" : "beginner"]}`
              : isCompleted
              ? "none"
              : "2px solid var(--tatva-border-secondary, #E5E5E5)",
            boxShadow: isAvailable
              ? "0 0 0 4px rgba(88, 204, 2, 0.15)"
              : undefined,
            cursor: isLocked ? "default" : "pointer",
            opacity: isLocked ? 0.4 : 1,
            transition: "all 0.2s ease",
            zIndex: 1,
          }}
          onClick={() => handleLessonClick(lesson, status)}
        >
          {isCompleted ? (
            <Icon name="check" size="sm" tone="inverse" />
          ) : isLocked ? (
            <Icon name="eye-off" size="sm" tone="tertiary" />
          ) : (
            <Icon name={config.icon} size="sm" tone="brand" />
          )}
        </div>
        </PulseRing>

        {/* Lesson content */}
        <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
          <div
            style={{
              cursor: isLocked ? "default" : "pointer",
              opacity: isLocked ? 0.5 : 1,
            }}
            onClick={() => handleLessonClick(lesson, status)}
          >
            <Box display="flex" align="center" gap={2}>
              <Text
                variant="label-md"
                tone={isLocked ? "tertiary" : undefined}
              >
                {lesson.title}
              </Text>
              {isCompleted && <Badge variant="green">Done</Badge>}
              {isAvailable && !isCompleted && (
                <Badge variant="brand">Up next</Badge>
              )}
            </Box>
            <Box display="flex" align="center" gap={2} mt={1}>
              <Text variant="body-xs" tone="tertiary">
                {config.label}
              </Text>
              <Text variant="body-xs" tone="tertiary">·</Text>
              <Text variant="body-xs" tone="tertiary">
                {lesson.durationMin} min
              </Text>
              <Text variant="body-xs" tone="tertiary">·</Text>
              <Text variant="body-xs" tone="tertiary">
                +{lesson.xpReward} XP
              </Text>
            </Box>
          </div>

          {/* Expanded detail card */}
          <AnimatePresence>
          {isActive && !isLocked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
            <Box
              mt={3}
              p={4}
              rounded="md"
              bg="surface-secondary"
              borderColor="primary"
              display="flex"
              direction="column"
              gap={3}
            >
              <Text variant="body-sm">{lesson.description}</Text>
              <Box display="flex" align="center" gap={2} wrap="wrap">
                <Badge variant="brand">+{lesson.xpReward} XP</Badge>
                {lesson.vocabSeeds && lesson.vocabSeeds.length > 0 && (
                  <Badge variant="green">
                    +{lesson.vocabSeeds.length} garden words
                  </Badge>
                )}
                {lesson.linkedScenarioId && (
                  <Badge variant="indigo">Scenario room</Badge>
                )}
              </Box>
              {isCompleted ? (
                <Text variant="body-xs" tone="positive">
                  Completed {lessonProgress[lesson.id]?.completedAt
                    ? new Date(lessonProgress[lesson.id].completedAt!).toLocaleDateString()
                    : ""}
                </Text>
              ) : lesson.type === "scenario" && lesson.linkedScenarioId ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    router.push(`/scenario-rooms/${lesson.linkedScenarioId}`)
                  }
                >
                  Enter Scenario Room
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    startLesson(lesson.id);
                    router.push(`/learning-path/lesson/${lesson.id}`);
                  }}
                >
                  Start Lesson
                </Button>
              )}
            </Box>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  function renderUnit(unit: Unit, unitIndex: number) {
    const progress = getUnitProgress(unit, lessonProgress);
    const done = isUnitCompleted(unit, lessonProgress);
    const diffColor = DIFFICULTY_COLOR[unit.difficulty] ?? "#58CC02";

    return (
      <div key={unit.id}>
        {/* Unit header card */}
        <Box
          p={5}
          rounded="lg"
          bg="surface-secondary"
          display="flex"
          align="center"
          gap={4}
          mb={2}
          style={{
            borderLeft: `4px solid ${done ? "#58CC02" : diffColor}`,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: done
                ? "linear-gradient(135deg, #58CC02, #46A302)"
                : `linear-gradient(135deg, ${diffColor}22, ${diffColor}11)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {done ? (
              <Icon name="check" size="md" tone="inverse" />
            ) : (
              <Icon name={unit.icon as IconName} size="md" tone="secondary" />
            )}
          </div>
          <Box display="flex" direction="column" gap={1} grow minW="0">
            <Box display="flex" align="center" gap={2} wrap="wrap">
              <Text variant="heading-sm">
                Unit {unitIndex + 1}
              </Text>
              <Text variant="heading-sm" tone="secondary">
                {unit.title}
              </Text>
              <Badge
                variant={
                  done
                    ? "green"
                    : unit.difficulty === "beginner"
                    ? "brand"
                    : unit.difficulty === "intermediate"
                    ? "yellow"
                    : "red"
                }
              >
                {done ? "Complete" : unit.difficulty}
              </Badge>
            </Box>
            <Text variant="body-xs" tone="secondary">
              {unit.description}
            </Text>
          </Box>
          <Box display="flex" direction="column" align="end" gap={1} style={{ flexShrink: 0 }}>
            <Text variant="heading-sm" tone={done ? "positive" : "secondary"}>
              {progress.completed}/{progress.total}
            </Text>
            <Box w={20} rounded="full" bg="tertiary" overflow="hidden" h={1}>
              <div
                style={{
                  height: "100%",
                  width: `${progress.percent}%`,
                  borderRadius: 9999,
                  background: done ? "#58CC02" : diffColor,
                  transition: "width 0.5s ease",
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Lesson timeline */}
        <Box pl={4} pt={2} pb={4}>
          {unit.lessons.map((lesson, i) =>
            renderLessonNode(
              lesson,
              lessonStatuses[lesson.id] ?? "locked",
              i,
              i === unit.lessons.length - 1
            )
          )}
        </Box>
      </div>
    );
  }

  const earnedMilestones = MILESTONES.filter((m) =>
    unlockedMilestones.includes(m.id)
  );
  const lockedMilestones = MILESTONES.filter(
    (m) => !unlockedMilestones.includes(m.id)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header
        type="main"
        left={{
          title: `${langInfo?.nativeName ?? "Language"} Learning Path`,
        }}
      />

      <Box as="main" grow overflow="auto" display="flex" direction="column" gap={6}>
        {/* Stats ribbon */}
        <Box
          p={5}
          rounded="lg"
          bg="surface-secondary"
          display="flex"
          align="center"
          gap={6}
        >
          {/* Progress ring */}
          <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--tatva-border-secondary, #E5E5E5)" strokeWidth="6" />
              <circle
                cx="36" cy="36" r="30" fill="none"
                stroke="#58CC02" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${overallPercent * 1.885} 188.5`}
                style={{ transition: "stroke-dasharray 1s ease" }}
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
              <Text variant="heading-sm">{overallPercent}%</Text>
            </div>
          </div>

          <Box display="flex" direction="column" gap={1} grow>
            <Text variant="heading-md">
              {identity.name}&apos;s Journey
            </Text>
            <Text variant="body-sm" tone="secondary">
              {completedCount}/{totalLessons} lessons · {completedUnitCount}/{curriculum.length} units · {currentLevel?.name ?? "Newcomer"}
            </Text>
          </Box>

          <Box display="flex" gap={6} style={{ flexShrink: 0 }}>
            <Box display="flex" direction="column" align="center">
              <Text variant="heading-sm">{streak}</Text>
              <Text variant="body-xs" tone="secondary">streak</Text>
            </Box>
            <Box display="flex" direction="column" align="center">
              <Text variant="heading-sm">{identity.xp}</Text>
              <Text variant="body-xs" tone="secondary">XP</Text>
            </Box>
            <Box display="flex" direction="column" align="center">
              <Text variant="heading-sm">{gardenCards.length}</Text>
              <Text variant="body-xs" tone="secondary">words</Text>
            </Box>
          </Box>
        </Box>

        {/* Tabs: Path / Milestones */}
        <Tabs
          tabs={[
            { value: "path", label: `Path (${completedCount}/${totalLessons})` },
            { value: "milestones", label: `Milestones (${earnedMilestones.length}/${MILESTONES.length})` },
          ]}
          value={tab}
          onValueChange={setTab}
        />

        {tab === "path" && (
          <StaggerContainer style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {curriculum.map((unit, i) => (
              <StaggerItem key={unit.id}>{renderUnit(unit, i)}</StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {tab === "milestones" && (
          <Box display="flex" direction="column" gap={6}>
            {/* Earned */}
            {earnedMilestones.length > 0 && (
              <Box display="flex" direction="column" gap={3}>
                <Text variant="label-md" tone="secondary">
                  Earned ({earnedMilestones.length})
                </Text>
                <div
                  className="grid gap-tatva-4"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
                >
                  {earnedMilestones.map((m) => (
                    <Box
                      key={m.id}
                      p={5}
                      rounded="lg"
                      bg="surface-secondary"
                      display="flex"
                      align="center"
                      gap={4}
                      style={{
                        borderLeft: "4px solid #58CC02",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "linear-gradient(135deg, #58CC0222, #58CC0211)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name={m.icon as IconName} size="md" tone="success" />
                      </div>
                      <Box display="flex" direction="column" gap={0}>
                        <Text variant="label-md">{m.title}</Text>
                        <Text variant="body-xs" tone="secondary">
                          {m.description}
                        </Text>
                      </Box>
                    </Box>
                  ))}
                </div>
              </Box>
            )}

            {/* Locked */}
            {lockedMilestones.length > 0 && (
              <Box display="flex" direction="column" gap={3}>
                <Text variant="label-md" tone="secondary">
                  Locked ({lockedMilestones.length})
                </Text>
                <div
                  className="grid gap-tatva-4"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
                >
                  {lockedMilestones.map((m) => (
                    <Box
                      key={m.id}
                      p={5}
                      rounded="lg"
                      bg="surface-secondary"
                      display="flex"
                      align="center"
                      gap={4}
                      style={{ opacity: 0.5 }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "var(--tatva-background-tertiary, #F3F3F3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name={m.icon as IconName} size="md" tone="tertiary" />
                      </div>
                      <Box display="flex" direction="column" gap={0}>
                        <Text variant="label-md">{m.title}</Text>
                        <Text variant="body-xs" tone="tertiary">
                          {m.description}
                        </Text>
                      </Box>
                    </Box>
                  ))}
                </div>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </div>
  );
}
