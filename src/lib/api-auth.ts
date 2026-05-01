import { auth } from "./auth";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Use when a route needs a real User row (FK targets). JWT can still hold a user id
 * after a DB reset or if the user was removed — in that case return 401.
 */
export async function getSessionUserOrNull() {
  const userId = await getAuthUserId();
  if (!userId) return { userId: null as null, user: null };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { userId, user: null };
  return { userId, user };
}

export function sessionInvalid() {
  return NextResponse.json(
    { error: "Session invalid. Please sign in again." },
    { status: 401 }
  );
}
