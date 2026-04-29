import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { IDENTITY_LEVELS } from "@/lib/constants";

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { amount } = await req.json();
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, xp: amount },
    update: { xp: { increment: amount } },
  });

  const newLevel = IDENTITY_LEVELS.findLast((l) => profile.xp >= l.minXp)?.level ?? 1;
  if (newLevel !== profile.level) {
    await prisma.userProfile.update({
      where: { userId },
      data: { level: newLevel },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyXp.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, earned: amount },
    update: { earned: { increment: amount } },
  });

  return NextResponse.json({ xp: profile.xp, level: newLevel });
}
