import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { lessonId } = await params;
  const body = await req.json();

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      status: body.status,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      xpEarned: body.xpEarned ?? null,
    },
    update: {
      status: body.status,
      completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      xpEarned: body.xpEarned ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
