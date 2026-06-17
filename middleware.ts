// middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes
  const publicRoutes = ["/", "/public/schedule", "/get-ticket", "/auth/error"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (isPublicRoute || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Protected routes
  if (!isAuth) {
    const loginUrl = new URL("/", req.url);
    loginUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(loginUrl);
  }

  // Admin protection
  if (pathname.startsWith("/admin") && userRole !== "1") {
    return NextResponse.redirect(new URL("/?error=forbidden", req.url));
  }

  // Student protection
  if (pathname.startsWith("/student") && userRole !== "2") {
    return NextResponse.redirect(new URL("/?error=forbidden", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|fonts).*)"],
};
