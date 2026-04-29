/**
 * Simplified Free Spaced Repetition Scheduler (FSRS) implementation.
 * Based on the FSRS-4.5 algorithm for optimal review scheduling.
 */

export interface FSRSCard {
  id: string;
  word: string;
  translation: string;
  language: string;
  category: "pronunciation" | "grammar" | "vocabulary" | "comprehension";
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  lastReview: string | null;
  nextReview: string;
  gardenStage: "seed" | "sprout" | "growing" | "blooming" | "harvested";
}

export type Rating = 1 | 2 | 3 | 4; // again, hard, good, easy

const W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.29, 2.61,
];

function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max);
}

function initDifficulty(rating: Rating): number {
  return clamp(W[4] - (rating - 3) * W[5], 1, 10);
}

function initStability(rating: Rating): number {
  return Math.max(W[rating - 1], 0.1);
}

function nextDifficulty(d: number, rating: Rating): number {
  const next = d - W[6] * (rating - 3);
  return clamp(W[7] * initDifficulty(3) + (1 - W[7]) * next, 1, 10);
}

function nextRecallStability(
  d: number,
  s: number,
  r: number,
  rating: Rating
): number {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp((1 - r) * W[10]) - 1) *
        hardPenalty *
        easyBonus)
  );
}

function nextForgetStability(d: number, s: number, r: number): number {
  return (
    W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1, W[13]) - 1) *
    Math.exp((1 - r) * W[14])
  );
}

function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

function nextInterval(stability: number): number {
  const desiredRetention = 0.9;
  return Math.max(
    1,
    Math.round(
      (stability / 9) * (Math.pow(desiredRetention, -1) - 1)
    )
  );
}

export function reviewCard(card: FSRSCard, rating: Rating): FSRSCard {
  const now = new Date();
  const lastReview = card.lastReview ? new Date(card.lastReview) : now;
  const elapsed = Math.max(
    0,
    (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24)
  );

  let newStability: number;
  let newDifficulty: number;
  let newState: FSRSCard["state"];
  let newLapses = card.lapses;

  if (card.state === "new") {
    newDifficulty = initDifficulty(rating);
    newStability = initStability(rating);
    newState = rating === 1 ? "learning" : "review";
    if (rating === 1) newLapses++;
  } else {
    newDifficulty = nextDifficulty(card.difficulty, rating);
    const r = retrievability(elapsed, card.stability);

    if (rating === 1) {
      newStability = nextForgetStability(newDifficulty, card.stability, r);
      newState = "relearning";
      newLapses++;
    } else {
      newStability = nextRecallStability(
        newDifficulty,
        card.stability,
        r,
        rating
      );
      newState = "review";
    }
  }

  const interval = rating === 1 ? 1 : nextInterval(newStability);
  const nextReviewDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  let gardenStage = card.gardenStage;
  if (rating >= 3 && card.gardenStage === "seed") gardenStage = "sprout";
  else if (rating >= 3 && card.gardenStage === "sprout") gardenStage = "growing";
  else if (rating >= 3 && card.gardenStage === "growing") gardenStage = "blooming";
  else if (rating === 4 && card.gardenStage === "blooming") gardenStage = "harvested";
  else if (rating === 1 && card.gardenStage !== "seed") gardenStage = "seed";

  return {
    ...card,
    stability: newStability,
    difficulty: newDifficulty,
    elapsedDays: elapsed,
    scheduledDays: interval,
    reps: card.reps + 1,
    lapses: newLapses,
    state: newState,
    lastReview: now.toISOString(),
    nextReview: nextReviewDate.toISOString(),
    gardenStage,
  };
}

export function getDueCards(cards: FSRSCard[]): FSRSCard[] {
  const now = new Date();
  return cards.filter(
    (c) => c.state === "new" || new Date(c.nextReview) <= now
  );
}

export function createCard(
  word: string,
  translation: string,
  language: string,
  category: FSRSCard["category"]
): FSRSCard {
  return {
    id: `${language}-${word}-${Date.now()}`,
    word,
    translation,
    language,
    category,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: "new",
    lastReview: null,
    nextReview: new Date().toISOString(),
    gardenStage: "seed",
  };
}
