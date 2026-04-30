import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const results = await prisma.scenarioResult.findMany({ where: { userId } });

  return NextResponse.json(
    results.map((r) => ({
      roomId: r.roomId,
      stars: r.stars,
      completedAt: r.completedAt.toISOString(),
      vocabUsed: r.vocabUsed,
      engFallbackCount: r.engFallbackCount,
    }))
  );
}

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await req.json();

  await prisma.scenarioResult.upsert({
    where: { userId_roomId: { userId, roomId: body.roomId } },
    create: {
      userId,
      roomId: body.roomId,
      stars: body.stars,
      completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
      vocabUsed: body.vocabUsed ?? 0,
      engFallbackCount: body.engFallbackCount ?? 0,
    },
    update: {
      stars: { set: Math.max(body.stars, 0) },
      completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
      vocabUsed: body.vocabUsed ?? 0,
      engFallbackCount: body.engFallbackCount ?? 0,
    },
  });

  return NextResponse.json({ ok: true });
}
