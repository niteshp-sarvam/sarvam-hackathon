import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/schemas/parse";
import { activityCreateSchema } from "@/lib/schemas/user";

export async function POST(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJsonBody(req, activityCreateSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

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
