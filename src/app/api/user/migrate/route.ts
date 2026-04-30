import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/schemas/parse";
import { migratePayloadSchema } from "@/lib/schemas/user";

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJsonBody(req, migratePayloadSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  // Use sequential non-transactional operations to avoid Neon serverless timeout.
  // Migration is idempotent, so partial failure is safe to retry.

  if (body.profile) {
    const p = body.profile;
    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        transliteratedName: p.transliteratedName ?? "",
        neighborhood: p.neighborhood ?? "",
        profession: p.profession ?? "",
        hobbies: p.hobbies ?? [],
        motivation: p.motivation ?? "",
        targetLanguage: p.targetLanguage ?? null,
        nativeLanguage: p.nativeLanguage ?? "en",
        isOnboarded: p.isOnboarded ?? false,
        xp: p.xp ?? 0,
        level: p.level ?? 1,
        streak: p.streak ?? 0,
        lastActiveDate: p.lastActiveDate ?? null,
        foundationLessonIds: p.foundationLessonIds ?? [],
      },
      update: {
        transliteratedName: p.transliteratedName ?? "",
        neighborhood: p.neighborhood ?? "",
        profession: p.profession ?? "",
        hobbies: p.hobbies ?? [],
        motivation: p.motivation ?? "",
        targetLanguage: p.targetLanguage ?? null,
        nativeLanguage: p.nativeLanguage ?? "en",
        isOnboarded: p.isOnboarded ?? false,
        xp: p.xp ?? 0,
        level: p.level ?? 1,
        streak: p.streak ?? 0,
        lastActiveDate: p.lastActiveDate ?? null,
        foundationLessonIds: p.foundationLessonIds ?? [],
      },
    });

    if (p.name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: p.name },
      });
    }
  }

  if (body.gardenCards?.length) {
    await prisma.gardenCard.createMany({
      data: body.gardenCards.map((c) => ({
        userId,
        word: c.word,
        translation: c.translation,
        language: c.language,
        category: c.category,
        stability: c.stability ?? 0,
        difficulty: c.difficulty ?? 0,
        elapsedDays: c.elapsedDays ?? 0,
        scheduledDays: c.scheduledDays ?? 0,
        reps: c.reps ?? 0,
        lapses: c.lapses ?? 0,
        state: c.state ?? "new",
        gardenStage: c.gardenStage ?? "seed",
        lastReview: c.lastReview ?? null,
        nextReview: c.nextReview ?? new Date(),
      })),
      skipDuplicates: true,
    });
  }

  if (body.scenarioResults?.length) {
    for (const r of body.scenarioResults) {
      await prisma.scenarioResult.upsert({
        where: { userId_roomId: { userId, roomId: r.roomId } },
        create: {
          userId,
          roomId: r.roomId,
          stars: r.stars,
          completedAt: r.completedAt ?? new Date(),
          vocabUsed: r.vocabUsed ?? 0,
          engFallbackCount: r.engFallbackCount ?? 0,
        },
        update: {
          stars: Math.max(r.stars, 0),
        },
      });
    }
  }

  if (body.lessonProgress) {
    for (const [lessonId, lp] of Object.entries(body.lessonProgress)) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          status: lp.status,
          completedAt: lp.completedAt ?? null,
          xpEarned: lp.xpEarned ?? null,
        },
        update: {
          status: lp.status,
        },
      });
    }
  }

  if (body.foundationMilestoneAt) {
    for (const [milestoneId, achievedAt] of Object.entries(body.foundationMilestoneAt)) {
      await prisma.foundationMilestone.upsert({
        where: { userId_milestoneId: { userId, milestoneId } },
        create: {
          userId,
          milestoneId,
          achievedAt,
        },
        update: {},
      });
    }
  }

  if (body.unlockedMilestones?.length) {
    for (const milestoneId of body.unlockedMilestones) {
      await prisma.unlockedMilestone.upsert({
        where: { userId_milestoneId: { userId, milestoneId } },
        create: { userId, milestoneId },
        update: {},
      });
    }
  }

  if (body.activityLog?.length) {
    await prisma.activityLogEntry.createMany({
      data: body.activityLog.slice(-100).map((a) => ({
        userId,
        type: a.type,
        referenceId: a.id,
        meta: a.meta ?? undefined,
        createdAt: a.ts ?? new Date(),
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, migrated: true });
}
