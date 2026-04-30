import { describe, it, expect } from "vitest";
import {
  getCurriculum,
  getLessonById,
  getUnitProgress,
  isUnitCompleted,
  computeLessonStatuses,
  MILESTONES,
  type LessonProgress,
  type MilestoneContext,
} from "../curriculum";
import { createCard, type FSRSCard } from "../fsrs";

const ALL_LANGS = ["hi", "ta", "te", "kn", "bn", "mr", "ml", "gu"] as const;

function emptyContext(overrides: Partial<MilestoneContext> = {}): MilestoneContext {
  return {
    completedLessons: [],
    completedUnits: [],
    streak: 0,
    totalXp: 0,
    gardenCards: [],
    scenarioStars: {},
    totalScenariosCompleted: 0,
    ...overrides,
  };
}

function gardenCard(overrides: Partial<FSRSCard> = {}): FSRSCard {
  return {
    ...createCard("foo", "bar", "hi", "vocabulary"),
    ...overrides,
  };
}

describe("getCurriculum", () => {
  it.each(ALL_LANGS)("returns 6 units for %s", (lang) => {
    const units = getCurriculum(lang);
    expect(units).toHaveLength(6);
  });

  it("each unit has at least one lesson with a stable id", () => {
    for (const lang of ALL_LANGS) {
      const units = getCurriculum(lang);
      for (const unit of units) {
        expect(unit.lessons.length).toBeGreaterThan(0);
        for (const lesson of unit.lessons) {
          expect(lesson.id).toMatch(new RegExp(`^${lang}-`));
          expect(lesson.title).toBeTruthy();
          expect(lesson.xpReward).toBeGreaterThan(0);
        }
      }
    }
  });

  it("returns the same reference across calls (caching)", () => {
    const a = getCurriculum("hi");
    const b = getCurriculum("hi");
    expect(a).toBe(b);
  });

  it("Hindi curriculum has at least one scenario lesson", () => {
    const units = getCurriculum("hi");
    const scenarioLessons = units
      .flatMap((u) => u.lessons)
      .filter((l) => l.type === "scenario");
    expect(scenarioLessons.length).toBeGreaterThan(0);
    expect(scenarioLessons[0].linkedScenarioId).toBeTruthy();
  });

  it("difficulties span beginner / intermediate", () => {
    const units = getCurriculum("hi");
    const difficulties = new Set(units.map((u) => u.difficulty));
    expect(difficulties.has("beginner")).toBe(true);
    expect(difficulties.has("intermediate")).toBe(true);
  });
});

describe("getLessonById", () => {
  it("finds a known lesson by id", () => {
    const found = getLessonById("hi", "hi-u1-l1");
    expect(found).not.toBeNull();
    expect(found?.lesson.id).toBe("hi-u1-l1");
    expect(found?.unit.id).toBe("hi-u1");
  });

  it("returns null for unknown ids", () => {
    expect(getLessonById("hi", "hi-fake-lesson")).toBeNull();
  });

  it("does not match lessons from other languages", () => {
    const taLessonId = getCurriculum("ta")[0].lessons[0].id;
    expect(getLessonById("hi", taLessonId)).toBeNull();
  });
});

describe("getUnitProgress", () => {
  it("reports zero progress when nothing is completed", () => {
    const unit = getCurriculum("hi")[0];
    const progress = getUnitProgress(unit, {});
    expect(progress.completed).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.total).toBe(unit.lessons.length);
  });

  it("counts only completed lessons", () => {
    const unit = getCurriculum("hi")[0];
    const lessonProgress: Record<string, LessonProgress> = {
      [unit.lessons[0].id]: { status: "completed" },
      [unit.lessons[1].id]: { status: "started" },
    };
    const progress = getUnitProgress(unit, lessonProgress);
    expect(progress.completed).toBe(1);
    expect(progress.percent).toBeCloseTo((1 / unit.lessons.length) * 100, 5);
  });

  it("reaches 100% when every lesson is completed", () => {
    const unit = getCurriculum("hi")[0];
    const lessonProgress: Record<string, LessonProgress> = Object.fromEntries(
      unit.lessons.map((l) => [l.id, { status: "completed" } as LessonProgress])
    );
    const progress = getUnitProgress(unit, lessonProgress);
    expect(progress.completed).toBe(unit.lessons.length);
    expect(progress.percent).toBe(100);
  });
});

describe("isUnitCompleted", () => {
  it("is false until every lesson is completed", () => {
    const unit = getCurriculum("hi")[0];
    expect(isUnitCompleted(unit, {})).toBe(false);
    const partial: Record<string, LessonProgress> = {
      [unit.lessons[0].id]: { status: "completed" },
    };
    expect(isUnitCompleted(unit, partial)).toBe(false);
  });

  it("is true once all lessons are completed", () => {
    const unit = getCurriculum("hi")[0];
    const all: Record<string, LessonProgress> = Object.fromEntries(
      unit.lessons.map((l) => [l.id, { status: "completed" } as LessonProgress])
    );
    expect(isUnitCompleted(unit, all)).toBe(true);
  });
});

describe("computeLessonStatuses", () => {
  it("only the first lesson of unit 1 is available with no progress", () => {
    const statuses = computeLessonStatuses("hi", {});
    const units = getCurriculum("hi");

    expect(statuses[units[0].lessons[0].id]).toBe("available");
    for (let i = 1; i < units[0].lessons.length; i++) {
      expect(statuses[units[0].lessons[i].id]).toBe("locked");
    }
    for (let li = 0; li < units[1].lessons.length; li++) {
      expect(statuses[units[1].lessons[li].id]).toBe("locked");
    }
  });

  it("completing a lesson unlocks the next", () => {
    const units = getCurriculum("hi");
    const statuses = computeLessonStatuses("hi", {
      [units[0].lessons[0].id]: { status: "completed" },
    });
    expect(statuses[units[0].lessons[0].id]).toBe("completed");
    expect(statuses[units[0].lessons[1].id]).toBe("available");
  });

  it("completing all lessons in a unit unlocks the next unit", () => {
    const units = getCurriculum("hi");
    const lessonProgress: Record<string, LessonProgress> = Object.fromEntries(
      units[0].lessons.map((l) => [l.id, { status: "completed" } as LessonProgress])
    );
    const statuses = computeLessonStatuses("hi", lessonProgress);
    expect(statuses[units[1].lessons[0].id]).toBe("available");
  });

  it("preserves a started lesson status", () => {
    const units = getCurriculum("hi");
    const statuses = computeLessonStatuses("hi", {
      [units[0].lessons[0].id]: { status: "started" },
    });
    expect(statuses[units[0].lessons[0].id]).toBe("started");
    expect(statuses[units[0].lessons[1].id]).toBe("locked");
  });
});

describe("MILESTONES", () => {
  it("contains entries for each major category", () => {
    const categories = new Set(MILESTONES.map((m) => m.category));
    expect(categories.has("path")).toBe(true);
    expect(categories.has("streak")).toBe(true);
    expect(categories.has("mastery")).toBe(true);
    expect(categories.has("scenario")).toBe(true);
    expect(categories.has("xp")).toBe(true);
  });

  it('"first-lesson" milestone fires after one completed lesson', () => {
    const m = MILESTONES.find((x) => x.id === "first-lesson")!;
    expect(m.check(emptyContext({ completedLessons: [] }))).toBe(false);
    expect(m.check(emptyContext({ completedLessons: ["hi-u1-l1"] }))).toBe(true);
  });

  it('"streak-3" / "streak-7" / "streak-30" fire at the right thresholds', () => {
    const s3 = MILESTONES.find((x) => x.id === "streak-3")!;
    const s7 = MILESTONES.find((x) => x.id === "streak-7")!;
    const s30 = MILESTONES.find((x) => x.id === "streak-30")!;

    expect(s3.check(emptyContext({ streak: 2 }))).toBe(false);
    expect(s3.check(emptyContext({ streak: 3 }))).toBe(true);
    expect(s7.check(emptyContext({ streak: 6 }))).toBe(false);
    expect(s7.check(emptyContext({ streak: 7 }))).toBe(true);
    expect(s30.check(emptyContext({ streak: 29 }))).toBe(false);
    expect(s30.check(emptyContext({ streak: 30 }))).toBe(true);
  });

  it('"garden-10" requires 10 cards', () => {
    const m = MILESTONES.find((x) => x.id === "garden-10")!;
    const nine = Array.from({ length: 9 }, () => gardenCard());
    const ten = Array.from({ length: 10 }, () => gardenCard());
    expect(m.check(emptyContext({ gardenCards: nine }))).toBe(false);
    expect(m.check(emptyContext({ gardenCards: ten }))).toBe(true);
  });

  it('"garden-blooming-5" counts blooming and harvested cards', () => {
    const m = MILESTONES.find((x) => x.id === "garden-blooming-5")!;
    const cards = [
      gardenCard({ gardenStage: "blooming" }),
      gardenCard({ gardenStage: "blooming" }),
      gardenCard({ gardenStage: "harvested" }),
      gardenCard({ gardenStage: "harvested" }),
      gardenCard({ gardenStage: "growing" }),
    ];
    expect(m.check(emptyContext({ gardenCards: cards }))).toBe(false);
    cards.push(gardenCard({ gardenStage: "blooming" }));
    expect(m.check(emptyContext({ gardenCards: cards }))).toBe(true);
  });

  it('"scenario-3-stars" detects any 3-star result', () => {
    const m = MILESTONES.find((x) => x.id === "scenario-3-stars")!;
    expect(m.check(emptyContext({ scenarioStars: { foo: 2 } }))).toBe(false);
    expect(m.check(emptyContext({ scenarioStars: { foo: 3 } }))).toBe(true);
  });

  it('"xp-100" / "xp-500" / "xp-2000" fire at thresholds', () => {
    const x100 = MILESTONES.find((x) => x.id === "xp-100")!;
    const x500 = MILESTONES.find((x) => x.id === "xp-500")!;
    const x2000 = MILESTONES.find((x) => x.id === "xp-2000")!;

    expect(x100.check(emptyContext({ totalXp: 99 }))).toBe(false);
    expect(x100.check(emptyContext({ totalXp: 100 }))).toBe(true);
    expect(x500.check(emptyContext({ totalXp: 499 }))).toBe(false);
    expect(x500.check(emptyContext({ totalXp: 500 }))).toBe(true);
    expect(x2000.check(emptyContext({ totalXp: 1999 }))).toBe(false);
    expect(x2000.check(emptyContext({ totalXp: 2000 }))).toBe(true);
  });

  it('"all-units-done" requires 6 completed units', () => {
    const m = MILESTONES.find((x) => x.id === "all-units-done")!;
    expect(m.check(emptyContext({ completedUnits: ["a", "b", "c", "d", "e"] }))).toBe(false);
    expect(m.check(emptyContext({ completedUnits: ["a", "b", "c", "d", "e", "f"] }))).toBe(true);
  });
});
