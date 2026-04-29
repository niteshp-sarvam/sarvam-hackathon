"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type LanguageCode, IDENTITY_LEVELS } from "./constants";
import type { CurriculumLessonId } from "./foundation-path";
import { mergeMilestoneDates } from "./foundation-path";
import type { LessonProgress } from "./curriculum";
import type { FSRSCard } from "./fsrs";

export interface UserIdentity {
  name: string;
  transliteratedName: string;
  neighborhood: string;
  profession: string;
  hobbies: string[];
  motivation: string;
  level: number;
  xp: number;
}

export interface ScenarioResult {
  roomId: string;
  stars: number;
  completedAt: string;
  vocabUsed: number;
  engFallbackCount: number;
}

export interface DailyXp {
  date: string;
  earned: number;
}

export interface ActivityEntry {
  type: "lesson_completed" | "scenario_completed" | "review_session" | "milestone_unlocked";
  id: string;
  ts: string;
  meta?: Record<string, unknown>;
}

interface AppState {
  isOnboarded: boolean;
  targetLanguage: LanguageCode | null;
  nativeLanguage: LanguageCode | "en";
  identity: UserIdentity | null;
  gardenCards: FSRSCard[];
  scenarioResults: ScenarioResult[];
  streak: number;
  lastActiveDate: string | null;

  lessonProgress: Record<string, LessonProgress>;
  unlockedMilestones: string[];
  dailyXp: DailyXp;
  activityLog: ActivityEntry[];

  /** Four-step onboarding path: listen → shadow → scenario → garden */
  foundationLessonIds: CurriculumLessonId[];
  foundationMilestoneAt: Record<string, string>;

  setOnboarded: (v: boolean) => void;
  setTargetLanguage: (lang: LanguageCode) => void;
  setNativeLanguage: (lang: LanguageCode | "en") => void;
  setIdentity: (identity: UserIdentity) => void;
  addGardenCard: (card: FSRSCard) => void;
  updateGardenCard: (id: string, card: FSRSCard) => void;
  addScenarioResult: (result: ScenarioResult) => void;
  addXp: (amount: number) => void;
  updateStreak: () => void;

  startLesson: (lessonId: string) => void;
  completeLesson: (lessonId: string, xpEarned: number) => void;
  unlockMilestone: (milestoneId: string) => void;
  addActivity: (entry: Omit<ActivityEntry, "ts">) => void;
  getTodayXp: () => number;
  markFoundationLesson: (lessonId: CurriculumLessonId) => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isOnboarded: false,
      targetLanguage: null,
      nativeLanguage: "en",
      identity: null,
      gardenCards: [],
      scenarioResults: [],
      streak: 0,
      lastActiveDate: null,

      lessonProgress: {},
      unlockedMilestones: [],
      dailyXp: { date: todayStr(), earned: 0 },
      activityLog: [],
      foundationLessonIds: [],
      foundationMilestoneAt: {},

      setOnboarded: (v) =>
        set((s) => {
          if (!v) return { isOnboarded: false };
          const foundationMilestoneAt = mergeMilestoneDates(
            s.foundationMilestoneAt,
            {
              isOnboarded: true,
              lessonIds: s.foundationLessonIds,
              scenarioCount: s.scenarioResults.length,
              streak: s.streak,
            }
          );
          return { isOnboarded: true, foundationMilestoneAt };
        }),
      setTargetLanguage: (lang) => set({ targetLanguage: lang }),
      setNativeLanguage: (lang) => set({ nativeLanguage: lang }),
      setIdentity: (identity) => set({ identity }),
      addGardenCard: (card) =>
        set((s) => ({ gardenCards: [...s.gardenCards, card] })),
      updateGardenCard: (id, card) =>
        set((s) => ({
          gardenCards: s.gardenCards.map((c) => (c.id === id ? card : c)),
        })),
      addScenarioResult: (result) =>
        set((s) => {
          const existing = s.scenarioResults.findIndex((r) => r.roomId === result.roomId);
          let scenarioResults: ScenarioResult[];
          if (existing >= 0) {
            scenarioResults = s.scenarioResults.map((r, i) =>
              i === existing
                ? { ...result, stars: Math.max(r.stars, result.stars) }
                : r
            );
          } else {
            scenarioResults = [...s.scenarioResults, result];
          }
          const foundationLessonIds: CurriculumLessonId[] =
            s.foundationLessonIds.includes("scenario")
              ? [...s.foundationLessonIds]
              : [...s.foundationLessonIds, "scenario"];
          const foundationMilestoneAt = mergeMilestoneDates(
            s.foundationMilestoneAt,
            {
              isOnboarded: s.isOnboarded,
              lessonIds: foundationLessonIds,
              scenarioCount: scenarioResults.length,
              streak: s.streak,
            }
          );

          // Auto-update streak on scenario completion
          const today = new Date().toDateString();
          let streak = s.streak;
          let lastActiveDate = s.lastActiveDate;
          if (lastActiveDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            streak = lastActiveDate === yesterday ? streak + 1 : 1;
            lastActiveDate = today;
          }

          return {
            scenarioResults,
            foundationLessonIds,
            foundationMilestoneAt,
            streak,
            lastActiveDate,
          };
        }),
      addXp: (amount) =>
        set((s) => {
          const today = todayStr();
          const dailyXp =
            s.dailyXp.date === today
              ? { date: today, earned: s.dailyXp.earned + amount }
              : { date: today, earned: amount };
          const newXp = (s.identity?.xp ?? 0) + amount;
          const newLevel =
            IDENTITY_LEVELS.findLast((l) => newXp >= l.minXp)?.level ?? 1;
          return {
            identity: s.identity
              ? { ...s.identity, xp: newXp, level: newLevel }
              : null,
            dailyXp,
          };
        }),
      updateStreak: () => {
        const today = new Date().toDateString();
        set((s) => {
          if (s.lastActiveDate === today) return s;
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          const newStreak = s.lastActiveDate === yesterday ? s.streak + 1 : 1;
          const foundationMilestoneAt = mergeMilestoneDates(
            s.foundationMilestoneAt,
            {
              isOnboarded: s.isOnboarded,
              lessonIds: s.foundationLessonIds,
              scenarioCount: s.scenarioResults.length,
              streak: newStreak,
            }
          );
          return {
            streak: newStreak,
            lastActiveDate: today,
            foundationMilestoneAt,
          };
        });
      },

      startLesson: (lessonId) =>
        set((s) => {
          const current = s.lessonProgress[lessonId]?.status;
          if (current === "completed" || current === "started") return s;
          return {
            lessonProgress: {
              ...s.lessonProgress,
              [lessonId]: { status: "started" },
            },
          };
        }),

      completeLesson: (lessonId, xpEarned) =>
        set((s) => {
          const alreadyCompleted = s.lessonProgress[lessonId]?.status === "completed";
          const xpToAdd = alreadyCompleted ? 0 : xpEarned;

          const today = todayStr();
          const dailyXp =
            xpToAdd > 0
              ? s.dailyXp.date === today
                ? { date: today, earned: s.dailyXp.earned + xpToAdd }
                : { date: today, earned: xpToAdd }
              : s.dailyXp;

          // Auto-update streak on lesson completion
          const todayDate = new Date().toDateString();
          let streak = s.streak;
          let lastActiveDate = s.lastActiveDate;
          if (lastActiveDate !== todayDate) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            streak = lastActiveDate === yesterday ? streak + 1 : 1;
            lastActiveDate = todayDate;
          }

          return {
            lessonProgress: {
              ...s.lessonProgress,
              [lessonId]: {
                status: "completed",
                completedAt: s.lessonProgress[lessonId]?.completedAt ?? new Date().toISOString(),
                xpEarned: s.lessonProgress[lessonId]?.xpEarned ?? xpEarned,
              },
            },
            identity: s.identity && xpToAdd > 0
              ? { ...s.identity, xp: s.identity.xp + xpToAdd }
              : s.identity,
            dailyXp,
            streak,
            lastActiveDate,
            activityLog: alreadyCompleted
              ? s.activityLog
              : [
                  ...s.activityLog.slice(-99),
                  {
                    type: "lesson_completed" as const,
                    id: lessonId,
                    ts: new Date().toISOString(),
                    meta: { xpEarned },
                  },
                ],
          };
        }),

      unlockMilestone: (milestoneId) =>
        set((s) => {
          if (s.unlockedMilestones.includes(milestoneId)) return s;
          return {
            unlockedMilestones: [...s.unlockedMilestones, milestoneId],
            activityLog: [
              ...s.activityLog.slice(-99),
              {
                type: "milestone_unlocked" as const,
                id: milestoneId,
                ts: new Date().toISOString(),
              },
            ],
          };
        }),

      addActivity: (entry) =>
        set((s) => ({
          activityLog: [
            ...s.activityLog.slice(-99),
            { ...entry, ts: new Date().toISOString() },
          ],
        })),

      getTodayXp: () => {
        const { dailyXp } = get();
        return dailyXp.date === todayStr() ? dailyXp.earned : 0;
      },

      markFoundationLesson: (lessonId) =>
        set((s) => {
          const foundationLessonIds: CurriculumLessonId[] =
            s.foundationLessonIds.includes(lessonId)
              ? [...s.foundationLessonIds]
              : [...s.foundationLessonIds, lessonId];
          const foundationMilestoneAt = mergeMilestoneDates(
            s.foundationMilestoneAt,
            {
              isOnboarded: s.isOnboarded,
              lessonIds: foundationLessonIds,
              scenarioCount: s.scenarioResults.length,
              streak: s.streak,
            }
          );
          return { foundationLessonIds, foundationMilestoneAt };
        }),
    }),
    { name: "bhashaverse-store" }
  )
);
