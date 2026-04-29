import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the sync layer so the store can be exercised without HTTP.
vi.mock("../sync", () => ({
  sync: {
    fetchState: vi.fn(async () => null),
    updateProfile: vi.fn(),
    addXp: vi.fn(),
    addGardenCard: vi.fn(),
    updateGardenCard: vi.fn(),
    upsertScenarioResult: vi.fn(),
    addActivity: vi.fn(),
    updateLesson: vi.fn(),
    unlockMilestone: vi.fn(),
  },
}));

import { useAppStore } from "../store";
import { createCard } from "../fsrs";

const initialState = useAppStore.getState();

function reset() {
  useAppStore.setState(
    {
      ...initialState,
      identity: {
        name: "Test User",
        transliteratedName: "",
        neighborhood: "",
        profession: "",
        hobbies: [],
        motivation: "",
        level: 1,
        xp: 0,
      },
      streak: 0,
      lastActiveDate: null,
      gardenCards: [],
      scenarioResults: [],
      lessonProgress: {},
      unlockedMilestones: [],
      activityLog: [],
      foundationLessonIds: [],
      foundationMilestoneAt: {},
      dailyXp: { date: new Date().toISOString().slice(0, 10), earned: 0 },
    },
    true
  );
}

describe("addXp", () => {
  beforeEach(reset);

  it("increases identity XP", () => {
    useAppStore.getState().addXp(25);
    expect(useAppStore.getState().identity?.xp).toBe(25);
  });

  it("accumulates XP across multiple calls", () => {
    useAppStore.getState().addXp(10);
    useAppStore.getState().addXp(15);
    expect(useAppStore.getState().identity?.xp).toBe(25);
  });

  it("updates dailyXp earned for today", () => {
    useAppStore.getState().addXp(40);
    const state = useAppStore.getState();
    expect(state.dailyXp.earned).toBe(40);
    expect(state.dailyXp.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it("resets dailyXp to today when last entry was yesterday", () => {
    useAppStore.setState({
      dailyXp: { date: "2000-01-01", earned: 99 },
    });
    useAppStore.getState().addXp(5);
    const state = useAppStore.getState();
    expect(state.dailyXp.date).toBe(new Date().toISOString().slice(0, 10));
    expect(state.dailyXp.earned).toBe(5);
  });

  it("getTodayXp returns 0 once the day rolls over", () => {
    useAppStore.setState({
      dailyXp: { date: "2000-01-01", earned: 50 },
    });
    expect(useAppStore.getState().getTodayXp()).toBe(0);
  });
});

describe("updateStreak", () => {
  beforeEach(reset);

  it("starts a new streak at 1 when there is no history", () => {
    useAppStore.getState().updateStreak();
    expect(useAppStore.getState().streak).toBe(1);
    expect(useAppStore.getState().lastActiveDate).toBe(new Date().toDateString());
  });

  it("does not increment when called twice on the same day", () => {
    useAppStore.getState().updateStreak();
    const after1 = useAppStore.getState().streak;
    useAppStore.getState().updateStreak();
    expect(useAppStore.getState().streak).toBe(after1);
  });

  it("increments by 1 when last active was yesterday", () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    useAppStore.setState({ streak: 4, lastActiveDate: yesterday });
    useAppStore.getState().updateStreak();
    expect(useAppStore.getState().streak).toBe(5);
  });

  it("resets to 1 if the user skipped a day", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toDateString();
    useAppStore.setState({ streak: 10, lastActiveDate: twoDaysAgo });
    useAppStore.getState().updateStreak();
    expect(useAppStore.getState().streak).toBe(1);
  });
});

describe("completeLesson", () => {
  beforeEach(reset);

  it("marks the lesson completed and adds XP", () => {
    useAppStore.getState().completeLesson("hi-u1-l1", 15);
    const state = useAppStore.getState();
    expect(state.lessonProgress["hi-u1-l1"]?.status).toBe("completed");
    expect(state.lessonProgress["hi-u1-l1"]?.xpEarned).toBe(15);
    expect(state.identity?.xp).toBe(15);
  });

  it("does not double-award XP if the same lesson is completed again", () => {
    useAppStore.getState().completeLesson("hi-u1-l1", 15);
    useAppStore.getState().completeLesson("hi-u1-l1", 15);
    expect(useAppStore.getState().identity?.xp).toBe(15);
  });

  it("logs an activity entry of type lesson_completed", () => {
    useAppStore.getState().completeLesson("hi-u1-l1", 10);
    const log = useAppStore.getState().activityLog;
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe("lesson_completed");
    expect(log[0].id).toBe("hi-u1-l1");
  });

  it("does not duplicate the activity entry on a repeat completion", () => {
    useAppStore.getState().completeLesson("hi-u1-l1", 10);
    useAppStore.getState().completeLesson("hi-u1-l1", 10);
    expect(useAppStore.getState().activityLog).toHaveLength(1);
  });

  it("starts the streak when a lesson is completed for the first time", () => {
    useAppStore.getState().completeLesson("hi-u1-l1", 10);
    expect(useAppStore.getState().streak).toBe(1);
    expect(useAppStore.getState().lastActiveDate).toBe(new Date().toDateString());
  });
});

describe("garden card actions", () => {
  beforeEach(reset);

  it("addGardenCard appends the card", () => {
    const card = createCard("namaste", "hello", "hi", "vocabulary");
    useAppStore.getState().addGardenCard(card);
    expect(useAppStore.getState().gardenCards).toHaveLength(1);
    expect(useAppStore.getState().gardenCards[0].word).toBe("namaste");
  });

  it("updateGardenCard replaces by id", () => {
    const card = createCard("namaste", "hello", "hi", "vocabulary");
    useAppStore.getState().addGardenCard(card);
    const updated = { ...card, gardenStage: "blooming" as const };
    useAppStore.getState().updateGardenCard(card.id, updated);
    expect(useAppStore.getState().gardenCards[0].gardenStage).toBe("blooming");
  });
});

describe("addScenarioResult", () => {
  beforeEach(reset);

  it("appends a new result and starts the streak", () => {
    useAppStore.getState().addScenarioResult({
      roomId: "chennai-market",
      stars: 2,
      completedAt: new Date().toISOString(),
      vocabUsed: 3,
      engFallbackCount: 1,
    });
    const state = useAppStore.getState();
    expect(state.scenarioResults).toHaveLength(1);
    expect(state.streak).toBe(1);
  });

  it("keeps the highest star count when re-attempting a scenario", () => {
    useAppStore.getState().addScenarioResult({
      roomId: "chennai-market",
      stars: 3,
      completedAt: new Date().toISOString(),
      vocabUsed: 5,
      engFallbackCount: 0,
    });
    useAppStore.getState().addScenarioResult({
      roomId: "chennai-market",
      stars: 1,
      completedAt: new Date().toISOString(),
      vocabUsed: 1,
      engFallbackCount: 3,
    });
    const results = useAppStore.getState().scenarioResults;
    expect(results).toHaveLength(1);
    expect(results[0].stars).toBe(3);
  });
});

describe("activityLog", () => {
  beforeEach(reset);

  it("addActivity appends an entry with a timestamp", () => {
    useAppStore.getState().addActivity({ type: "review_session", id: "demo" });
    const log = useAppStore.getState().activityLog;
    expect(log).toHaveLength(1);
    expect(log[0].id).toBe("demo");
    expect(typeof log[0].ts).toBe("string");
    expect(new Date(log[0].ts).toString()).not.toBe("Invalid Date");
  });

  it("caps the activity log at ~100 entries", () => {
    for (let i = 0; i < 120; i++) {
      useAppStore.getState().addActivity({ type: "review_session", id: `r${i}` });
    }
    const log = useAppStore.getState().activityLog;
    expect(log.length).toBeLessThanOrEqual(100);
    expect(log.at(-1)?.id).toBe("r119");
  });
});
