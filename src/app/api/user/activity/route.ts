import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await req.json();

  await prisma.activityLogEntry.create({
    data: {
      userId,
      type: body.type,
      referenceId: body.id,
      meta: body.meta ?? undefined,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
