import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

/**
 * Public routes that don't require authentication.
 */
const PUBLIC_ROUTES = new Set(["/", "/login", "/auth/callback"]);

/**
 * Routes that authenticated users should be redirected away from.
 */
const AUTH_ONLY_ROUTES = new Set(["/login"]);

export async function proxy(request: NextRequest) {
  // First, refresh the session
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Skip auth checks for public assets and API routes
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return response;
  }

  // Create a Supabase client to check auth state
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser favicon)
     * - public folder assets (icons, manifest, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
