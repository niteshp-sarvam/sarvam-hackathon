import { z } from "zod";
import {
  boundedString,
  jsonValueSchema,
  languageCodeSchema,
  nativeLanguageSchema,
  nonNegativeIntWithMax,
  positiveIntWithMax,
} from "./common";

const isoDateSchema = z.coerce.date();

const lessonProgressSchema = z.object({
  status: z.enum(["locked", "available", "started", "completed"]),
  completedAt: isoDateSchema.optional(),
  xpEarned: nonNegativeIntWithMax(100000).optional(),
});

const gardenCardSchema = z.object({
  word: boundedString(120),
  translation: boundedString(200),
  language: boundedString(16),
  category: boundedString(32),
  stability: z.number().min(0).max(1000).optional(),
  difficulty: z.number().min(0).max(1000).optional(),
  elapsedDays: z.number().min(0).max(36500).optional(),
  scheduledDays: z.number().min(0).max(36500).optional(),
  reps: nonNegativeIntWithMax(100000).optional(),
  lapses: nonNegativeIntWithMax(100000).optional(),
  state: boundedString(32).optional(),
  gardenStage: boundedString(32).optional(),
  lastReview: isoDateSchema.nullable().optional(),
  nextReview: isoDateSchema.optional(),
});

const scenarioResultSchema = z.object({
  roomId: boundedString(80),
  stars: z.number().int().min(0).max(3),
  completedAt: isoDateSchema.optional(),
  vocabUsed: nonNegativeIntWithMax(100000).optional(),
  engFallbackCount: nonNegativeIntWithMax(100000).optional(),
});

const activityLogSchema = z.object({
  type: boundedString(80),
  id: boundedString(120),
  ts: isoDateSchema.optional(),
  meta: jsonValueSchema.optional(),
});

export const userProfileUpdateSchema = z.object({
  name: boundedString(80).optional(),
  transliteratedName: boundedString(120).optional(),
  neighborhood: boundedString(120).optional(),
  profession: boundedString(120).optional(),
  hobbies: z.array(boundedString(60)).max(20).optional(),
  motivation: boundedString(240).optional(),
  targetLanguage: languageCodeSchema.nullable().optional(),
  nativeLanguage: nativeLanguageSchema.optional(),
  isOnboarded: z.boolean().optional(),
  xp: nonNegativeIntWithMax(10000000).optional(),
  level: z.number().int().min(1).max(1000).optional(),
  streak: nonNegativeIntWithMax(10000).optional(),
  lastActiveDate: isoDateSchema.nullable().optional(),
  foundationLessonIds: z.array(boundedString(80)).max(200).optional(),
});

export const activityCreateSchema = z.object({
  type: boundedString(80),
  id: boundedString(120),
  meta: jsonValueSchema.optional(),
});

export const xpIncrementSchema = z.object({
  amount: positiveIntWithMax(1000),
});

export const migratePayloadSchema = z.object({
  profile: userProfileUpdateSchema.optional(),
  gardenCards: z.array(gardenCardSchema).max(2000).optional(),
  scenarioResults: z.array(scenarioResultSchema).max(1000).optional(),
  lessonProgress: z.record(z.string(), lessonProgressSchema).optional(),
  foundationMilestoneAt: z.record(z.string(), isoDateSchema).optional(),
  unlockedMilestones: z.array(boundedString(80)).max(500).optional(),
  activityLog: z.array(activityLogSchema).max(1000).optional(),
});

export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;
export type MigratePayloadInput = z.infer<typeof migratePayloadSchema>;
