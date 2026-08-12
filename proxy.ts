// proxy.ts — Next.js 16 renamed the middleware convention to proxy.
// Optimistic role gating only; real authorization lives in layouts and inside
// every server action (actions are publicly POSTable).
import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const publicRoutes = [
    "/",
    "/public/schedule",
    "/get-ticket",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/error",
    "/live-queue",
  ];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isApiRoute =
    pathname.startsWith("/api/auth") || pathname.startsWith("/api/public");
  const isStaticFile =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts") ||
    pathname === "/favicon.ico";

  if (isPublicRoute || isApiRoute || isStaticFile) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL("/", req.url);
    loginUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && req.auth.user?.role !== "1") {
    const homeUrl = new URL("/", req.url);
    homeUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(homeUrl);
  }

  if (pathname.startsWith("/student") && req.auth.user?.role !== "2") {
    const homeUrl = new URL("/", req.url);
    homeUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(homeUrl);
  }

  // Staff portal: registrar ("3"), dean ("4"), and cashier ("6")
  if (
    pathname.startsWith("/staff") &&
    !["3", "4", "6"].includes(req.auth.user?.role ?? "")
  ) {
    const homeUrl = new URL("/", req.url);
    homeUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|fonts).*)"],
};
