import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { name, ...profileData } = await req.json();

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
