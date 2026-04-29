/**
 * MVP “foundation path”: four concrete wins mapped to existing app routes.
 * (Full multi-unit curriculum lives in curriculum.ts.)
 */

export const CURRICULUM_LESSONS = [
  {
    id: "listen",
    title: "Eavesdrop once",
    description: "Generate a short conversation and tune your ear.",
    route: "/eavesdrop",
    order: 0,
  },
  {
    id: "shadow",
    title: "Shadow a line",
    description: "Record one phrase and match the model.",
    route: "/shadow-speaking",
    order: 1,
  },
  {
    id: "scenario",
    title: "Finish a scenario",
    description: "Complete one role-play room in your language.",
    route: "/scenario-rooms",
    order: 2,
  },
  {
    id: "garden",
    title: "Review in Garden",
    description: "Rate at least one memory card.",
    route: "/garden",
    order: 3,
  },
] as const;

export type CurriculumLessonId = (typeof CURRICULUM_LESSONS)[number]["id"];

export const CURRICULUM_LESSON_IDS: CurriculumLessonId[] =
  CURRICULUM_LESSONS.map((l) => l.id);

export const MILESTONE_DEFS = [
  {
    id: "welcome",
    title: "Welcome aboard",
    description: "You’ve started your journey.",
  },
  {
    id: "listener",
    title: "Active listener",
    description: "Completed your first Eavesdrop loop.",
  },
  {
    id: "voice",
    title: "Finding your voice",
    description: "Practiced shadow speaking.",
  },
  {
    id: "improv",
    title: "In the wild",
    description: "Finished a scenario room.",
  },
  {
    id: "rooted",
    title: "Memory garden",
    description: "Reviewed vocabulary in the Garden.",
  },
  {
    id: "hot_streak",
    title: "Three-day spark",
    description: "Studied three days in a row.",
  },
  {
    id: "graduate",
    title: "Foundation path",
    description: "All four starter lessons done.",
  },
] as const;

export type MilestoneId = (typeof MILESTONE_DEFS)[number]["id"];

export type ProgressSnapshot = {
  isOnboarded: boolean;
  lessonIds: readonly string[];
  scenarioCount: number;
  streak: number;
};

function milestonePredicate(id: MilestoneId, s: ProgressSnapshot): boolean {
  switch (id) {
    case "welcome":
      return s.isOnboarded;
    case "listener":
      return s.lessonIds.includes("listen");
    case "voice":
      return s.lessonIds.includes("shadow");
    case "improv":
      return s.scenarioCount >= 1;
    case "rooted":
      return s.lessonIds.includes("garden");
    case "hot_streak":
      return s.streak >= 3;
    case "graduate":
      return CURRICULUM_LESSON_IDS.every((lid) => s.lessonIds.includes(lid));
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/** Merge newly-earned milestones with existing ISO timestamps. */
export function mergeMilestoneDates(
  existing: Record<string, string>,
  snapshot: ProgressSnapshot
): Record<string, string> {
  const next = { ...existing };
  const now = new Date().toISOString();
  for (const m of MILESTONE_DEFS) {
    if (!next[m.id] && milestonePredicate(m.id as MilestoneId, snapshot)) {
      next[m.id] = now;
    }
  }
  return next;
}

export function getNextLesson(completedIds: readonly string[]) {
  return CURRICULUM_LESSONS.find((l) => !completedIds.includes(l.id)) ?? null;
}

export function curriculumStepperSteps() {
  return CURRICULUM_LESSONS.map((l) => ({
    label: l.title.replace(/ once$/, "").replace(/ in Garden$/, ""),
  }));
}

export function completedLessonCount(completedIds: readonly string[]) {
  return CURRICULUM_LESSON_IDS.filter((id) => completedIds.includes(id))
    .length;
}
