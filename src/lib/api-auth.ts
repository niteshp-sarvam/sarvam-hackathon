import { auth } from "./auth";
import { NextResponse } from "next/server";

export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
