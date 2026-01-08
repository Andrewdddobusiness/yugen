import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import protectedRoutes from "./protectedRoutes";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route: string) => pathname.startsWith(route));
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signUp");
  const allowAuthedAuthRoutes =
    pathname.startsWith("/login/reset") ||
    pathname.startsWith("/login/updatePassword") ||
    pathname.startsWith("/auth/verify-email") ||
    pathname.startsWith("/auth/confirm") ||
    pathname.startsWith("/auth/callback");

  // Avoid a Supabase auth roundtrip for routes that don't need it.
  // This keeps middleware overhead low for public pages and most auth flows.
  const shouldCheckAuth = isProtectedRoute || (isAuthRoute && !allowAuthedAuthRoutes);
  if (!shouldCheckAuth) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute && !allowAuthedAuthRoutes) {
    return NextResponse.redirect(new URL("/itineraries", request.url));
  }

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && (error || !user)) {
    const loginUrl = new URL("/login", request.url);
    // Store the original URL to redirect back after login
    const original = `${pathname}${request.nextUrl.search || ""}`;
    loginUrl.searchParams.set("next", original);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
