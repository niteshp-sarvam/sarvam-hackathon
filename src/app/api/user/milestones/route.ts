import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { milestoneId, type, achievedAt } = await req.json();

  if (type === "foundation") {
    await prisma.foundationMilestone.upsert({
      where: { userId_milestoneId: { userId, milestoneId } },
      create: {
        userId,
        milestoneId,
        achievedAt: achievedAt ? new Date(achievedAt) : new Date(),
      },
      update: {},
    });
  } else {
    await prisma.unlockedMilestone.upsert({
      where: { userId_milestoneId: { userId, milestoneId } },
      create: {
        userId,
        milestoneId,
        unlockedAt: new Date(),
      },
      update: {},
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
