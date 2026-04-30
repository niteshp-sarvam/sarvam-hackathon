import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware must stay small (Vercel Hobby ~1 MB limit).
 * Do not import `@/lib/auth` here — it pulls Prisma, bcrypt, and adapters into the bundle.
 * JWT session strategy: `getToken` only needs `AUTH_SECRET` + the session cookie.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const secureCookie =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:";

  const secret = process.env.AUTH_SECRET;
  const token = secret
    ? await getToken({ req: request, secret, secureCookie })
    : null;
  const isLoggedIn = !!token;

  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth");

  if (isPublicRoute) {
    if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
