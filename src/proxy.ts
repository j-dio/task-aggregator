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

  // Server actions expect an RSC payload; redirecting these requests can
  // return HTML and crash the client with syntax errors.
  if (request.headers.has("next-action")) {
    return response;
  }

  // Skip auth checks for APIs, auth callbacks, and framework/static assets.
  // This prevents redirects from breaking CSS/JS/image loading.
  const isFrameworkAsset =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$/i.test(pathname);

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    isFrameworkAsset
  ) {
    return response;
  }

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.has(pathname);

  // /tappers/join/* stays protected (not in PUBLIC_ROUTES). Unauthenticated
  // visitors hit the branch below: redirect to /login?next=<full pathname>.
  // Authenticated users fall through with the refreshed session response.

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
