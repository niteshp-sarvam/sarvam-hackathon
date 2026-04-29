import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await req.json();

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
        lastActiveDate: p.lastActiveDate ? new Date(p.lastActiveDate) : null,
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
        lastActiveDate: p.lastActiveDate ? new Date(p.lastActiveDate) : null,
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
      data: body.gardenCards.map((c: Record<string, unknown>) => ({
        userId,
        word: c.word as string,
        translation: c.translation as string,
        language: c.language as string,
        category: c.category as string,
        stability: (c.stability as number) ?? 0,
        difficulty: (c.difficulty as number) ?? 0,
        elapsedDays: (c.elapsedDays as number) ?? 0,
        scheduledDays: (c.scheduledDays as number) ?? 0,
        reps: (c.reps as number) ?? 0,
        lapses: (c.lapses as number) ?? 0,
        state: (c.state as string) ?? "new",
        gardenStage: (c.gardenStage as string) ?? "seed",
        lastReview: c.lastReview ? new Date(c.lastReview as string) : null,
        nextReview: c.nextReview ? new Date(c.nextReview as string) : new Date(),
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
          completedAt: r.completedAt ? new Date(r.completedAt) : new Date(),
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
      const progress = lp as { status: string; completedAt?: string; xpEarned?: number };
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          status: progress.status,
          completedAt: progress.completedAt ? new Date(progress.completedAt) : null,
          xpEarned: progress.xpEarned ?? null,
        },
        update: {
          status: progress.status,
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
          achievedAt: new Date(achievedAt as string),
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
      data: body.activityLog.slice(-100).map((a: Record<string, unknown>) => ({
        userId,
        type: a.type as string,
        referenceId: a.id as string | undefined,
        meta: (a.meta as string) ?? undefined,
        createdAt: a.ts ? new Date(a.ts as string) : new Date(),
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, migrated: true });
}
