import { NextResponse } from "next/server";
import { getSessionUserOrNull, sessionInvalid, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/schemas/parse";
import { userProfileUpdateSchema } from "@/lib/schemas/user";

export async function GET() {
  const { userId, user } = await getSessionUserOrNull();
  if (!userId) return unauthorized();
  if (!user) return sessionInvalid();

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const { userId, user } = await getSessionUserOrNull();
  if (!userId) return unauthorized();
  if (!user) return sessionInvalid();

  const parsed = await parseJsonBody(req, userProfileUpdateSchema);
  if (!parsed.success) return parsed.response;

  const { name, ...profileData } = parsed.data;

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  });

  if (name !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { name },
    });
  }

  return NextResponse.json(profile);
}
