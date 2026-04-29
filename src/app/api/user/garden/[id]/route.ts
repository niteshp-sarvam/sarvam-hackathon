import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.gardenCard.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const card = await prisma.gardenCard.update({
    where: { id },
    data: {
      stability: body.stability,
      difficulty: body.difficulty,
      elapsedDays: body.elapsedDays,
      scheduledDays: body.scheduledDays,
      reps: body.reps,
      lapses: body.lapses,
      state: body.state,
      gardenStage: body.gardenStage,
      lastReview: body.lastReview ? new Date(body.lastReview) : null,
      nextReview: body.nextReview ? new Date(body.nextReview) : undefined,
    },
  });

  return NextResponse.json({ id: card.id });
}
