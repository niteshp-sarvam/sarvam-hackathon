import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const dueOnly = searchParams.get("due") === "true";

  const where = dueOnly
    ? { userId, nextReview: { lte: new Date() } }
    : { userId };

  const cards = await prisma.gardenCard.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    cards.map((c) => ({
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
    }))
  );
}

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await req.json();

  const card = await prisma.gardenCard.create({
    data: {
      userId,
      word: body.word,
      translation: body.translation,
      language: body.language,
      category: body.category,
      stability: body.stability ?? 0,
      difficulty: body.difficulty ?? 0,
      elapsedDays: body.elapsedDays ?? 0,
      scheduledDays: body.scheduledDays ?? 0,
      reps: body.reps ?? 0,
      lapses: body.lapses ?? 0,
      state: body.state ?? "new",
      gardenStage: body.gardenStage ?? "seed",
      lastReview: body.lastReview ? new Date(body.lastReview) : null,
      nextReview: body.nextReview ? new Date(body.nextReview) : new Date(),
    },
  });

  return NextResponse.json({ id: card.id }, { status: 201 });
}
