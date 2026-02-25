import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Public routes that don't require authentication.
 */
const PUBLIC_ROUTES = new Set(["/", "/login", "/auth/callback"]);

/**
 * Routes that authenticated users should be redirected away from.
 */
const AUTH_ONLY_ROUTES = new Set(["/login"]);

export async function proxy(request: NextRequest) {
  // Refresh the session and get auth state in a single call
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Skip auth checks for public assets and API routes
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return response;
  }

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.has(pathname);

  // Redirect authenticated users away from login
  if (user && isAuthOnlyRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login (for protected routes)
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
