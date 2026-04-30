import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const [
    user,
    profile,
    gardenCards,
    scenarioResults,
    lessonProgress,
    activityLog,
    dailyXpRows,
    foundationMilestones,
    unlockedMilestones,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.gardenCard.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.scenarioResult.findMany({ where: { userId } }),
    prisma.lessonProgress.findMany({ where: { userId } }),
    prisma.activityLogEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.dailyXp.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 1,
    }),
    prisma.foundationMilestone.findMany({ where: { userId } }),
    prisma.unlockedMilestone.findMany({ where: { userId } }),
  ]);

  const todayXp = dailyXpRows[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const dailyXpDate = todayXp?.date ? new Date(todayXp.date).toISOString().slice(0, 10) : null;

  return NextResponse.json({
    user,
    profile,
    gardenCards: gardenCards.map((c) => ({
      id: c.id,
      word: c.word,
      translation: c.translation,
      language: c.language,
      category: c.category,
      stability: c.stability,
      difficulty: c.difficulty,
      elapsedDays: c.elapsedDays,
      scheduledDays: c.scheduledDays,
      reps: c.reps,
      lapses: c.lapses,
      state: c.state,
      gardenStage: c.gardenStage,
      lastReview: c.lastReview?.toISOString() ?? null,
      nextReview: c.nextReview.toISOString(),
    })),
    scenarioResults: scenarioResults.map((r) => ({
      roomId: r.roomId,
      stars: r.stars,
      completedAt: r.completedAt.toISOString(),
      vocabUsed: r.vocabUsed,
      engFallbackCount: r.engFallbackCount,
    })),
    lessonProgress: Object.fromEntries(
      lessonProgress.map((lp) => [
        lp.lessonId,
        {
          status: lp.status,
          completedAt: lp.completedAt?.toISOString(),
          xpEarned: lp.xpEarned,
        },
      ])
    ),
    activityLog: activityLog.reverse().map((a) => ({
      type: a.type,
      id: a.referenceId,
      ts: a.createdAt.toISOString(),
      meta: a.meta as Record<string, unknown> | undefined,
    })),
    dailyXp: {
      date: dailyXpDate === today ? today : today,
      earned: dailyXpDate === today ? (todayXp?.earned ?? 0) : 0,
    },
    foundationMilestoneAt: Object.fromEntries(
      foundationMilestones.map((m) => [m.milestoneId, m.achievedAt.toISOString()])
    ),
    unlockedMilestones: unlockedMilestones.map((m) => m.milestoneId),
  });
}
