import { describe, it, expect } from "vitest";
import {
  createCard,
  reviewCard,
  getDueCards,
  type FSRSCard,
  type Rating,
} from "../fsrs";

const DAY = 24 * 60 * 60 * 1000;

describe("createCard", () => {
  it("creates a card in the seed garden stage with new state", () => {
    const card = createCard("namaste", "hello", "hi", "vocabulary");

    expect(card.word).toBe("namaste");
    expect(card.translation).toBe("hello");
    expect(card.language).toBe("hi");
    expect(card.category).toBe("vocabulary");
    expect(card.state).toBe("new");
    expect(card.gardenStage).toBe("seed");
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.lastReview).toBeNull();
    expect(card.nextReview).toBeTruthy();
    expect(new Date(card.nextReview).toString()).not.toBe("Invalid Date");
  });

  it("stores nativeText when provided", () => {
    const card = createCard("namaste", "hello", "hi", "vocabulary", "नमस्ते");
    expect(card.nativeText).toBe("नमस्ते");
  });

  it("leaves nativeText undefined when omitted", () => {
    const card = createCard("namaste", "hello", "hi", "vocabulary");
    expect(card.nativeText).toBeUndefined();
  });

  it("generates unique-looking ids that include language and word", () => {
    const a = createCard("namaste", "hello", "hi", "vocabulary");
    const b = createCard("dhanyavaad", "thanks", "hi", "vocabulary");
    expect(a.id).toContain("hi");
    expect(a.id).toContain("namaste");
    expect(b.id).toContain("dhanyavaad");
    expect(a.id).not.toBe(b.id);
  });
});

describe("reviewCard - state transitions", () => {
  it('"again" (1) on a new card moves it to learning and counts a lapse', () => {
    const card = createCard("foo", "bar", "hi", "vocabulary");
    const next = reviewCard(card, 1);
    expect(next.state).toBe("learning");
    expect(next.lapses).toBe(1);
    expect(next.reps).toBe(1);
  });

  it('"good" (3) on a new card moves it to review without a lapse', () => {
    const card = createCard("foo", "bar", "hi", "vocabulary");
    const next = reviewCard(card, 3);
    expect(next.state).toBe("review");
    expect(next.lapses).toBe(0);
    expect(next.reps).toBe(1);
  });

  it('"again" on a previously learned card transitions state to relearning and increments lapses', () => {
    const card = createCard("foo", "bar", "hi", "vocabulary");
    const learned = reviewCard(card, 3);
    const failed = reviewCard(learned, 1);
    expect(failed.state).toBe("relearning");
    expect(failed.lapses).toBe(learned.lapses + 1);
  });

  it("updates lastReview and nextReview timestamps", () => {
    const card = createCard("foo", "bar", "hi", "vocabulary");
    const before = Date.now();
    const reviewed = reviewCard(card, 3);
    const lastReview = reviewed.lastReview && new Date(reviewed.lastReview).getTime();
    expect(lastReview).toBeGreaterThanOrEqual(before);
    expect(new Date(reviewed.nextReview).getTime()).toBeGreaterThan(
      lastReview ?? 0
    );
  });

  it("schedules a longer next interval for higher ratings", () => {
    const card = createCard("foo", "bar", "hi", "vocabulary");
    const goodReview = reviewCard(card, 3);
    const easyReview = reviewCard(card, 4);
    expect(easyReview.scheduledDays).toBeGreaterThanOrEqual(goodReview.scheduledDays);
  });
});

describe("reviewCard - garden stage progression", () => {
  it("promotes seed → sprout on a successful first review", () => {
    const seed = createCard("foo", "bar", "hi", "vocabulary");
    expect(seed.gardenStage).toBe("seed");
    const reviewed = reviewCard(seed, 3);
    expect(reviewed.gardenStage).toBe("sprout");
  });

  it("promotes through sprout → growing → blooming on consecutive successes", () => {
    let card = createCard("foo", "bar", "hi", "vocabulary");
    card = reviewCard(card, 3); // sprout
    expect(card.gardenStage).toBe("sprout");
    card = reviewCard(card, 3); // growing
    expect(card.gardenStage).toBe("growing");
    card = reviewCard(card, 3); // blooming
    expect(card.gardenStage).toBe("blooming");
  });

  it("only an Easy (4) rating harvests a blooming card", () => {
    let card = createCard("foo", "bar", "hi", "vocabulary");
    card = reviewCard(card, 3);
    card = reviewCard(card, 3);
    card = reviewCard(card, 3);
    expect(card.gardenStage).toBe("blooming");

    const goodOnBloom = reviewCard(card, 3);
    expect(goodOnBloom.gardenStage).toBe("blooming");

    const easyOnBloom = reviewCard(card, 4);
    expect(easyOnBloom.gardenStage).toBe("harvested");
  });

  it('"again" (1) drops a non-seed card back to seed', () => {
    let card = createCard("foo", "bar", "hi", "vocabulary");
    card = reviewCard(card, 3);
    card = reviewCard(card, 3);
    expect(card.gardenStage).toBe("growing");
    const failed = reviewCard(card, 1);
    expect(failed.gardenStage).toBe("seed");
  });

  it('"again" (1) on a seed card stays at seed', () => {
    const card = createCard("foo", "bar", "hi", "vocabulary");
    const failed = reviewCard(card, 1);
    expect(failed.gardenStage).toBe("seed");
  });
});

describe("getDueCards", () => {
  function withNextReview(card: FSRSCard, when: Date): FSRSCard {
    return { ...card, nextReview: when.toISOString() };
  }

  it("returns all new cards regardless of nextReview", () => {
    const card = createCard("foo", "bar", "hi", "vocabulary");
    const future = withNextReview(card, new Date(Date.now() + 7 * DAY));
    const due = getDueCards([future]);
    expect(due).toHaveLength(1);
  });

  it("returns review cards whose nextReview is in the past or now", () => {
    const card = reviewCard(createCard("foo", "bar", "hi", "vocabulary"), 3);
    expect(card.state).toBe("review");
    const past = withNextReview(card, new Date(Date.now() - DAY));
    expect(getDueCards([past])).toHaveLength(1);
  });

  it("excludes review cards scheduled for the future", () => {
    const card = reviewCard(createCard("foo", "bar", "hi", "vocabulary"), 3);
    const future = withNextReview(card, new Date(Date.now() + 7 * DAY));
    expect(getDueCards([future])).toHaveLength(0);
  });

  it("preserves order of input array", () => {
    const a = createCard("a", "x", "hi", "vocabulary");
    const b = createCard("b", "y", "hi", "vocabulary");
    const c = createCard("c", "z", "hi", "vocabulary");
    const out = getDueCards([a, b, c]);
    expect(out.map((card) => card.word)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array when given no cards", () => {
    expect(getDueCards([])).toEqual([]);
  });
});

describe("reviewCard - rating type safety", () => {
  it("accepts all four valid ratings", () => {
    const card = createCard("foo", "bar", "hi", "vocabulary");
    const ratings: Rating[] = [1, 2, 3, 4];
    for (const r of ratings) {
      const next = reviewCard(card, r);
      expect(typeof next.stability).toBe("number");
      expect(Number.isFinite(next.stability)).toBe(true);
      expect(next.difficulty).toBeGreaterThanOrEqual(1);
      expect(next.difficulty).toBeLessThanOrEqual(10);
    }
  });
});
