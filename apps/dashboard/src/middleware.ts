import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/docs", "/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and their sub-paths for docs
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/docs")) {
    return NextResponse.next();
  }

  // Allow static assets and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get("alrt_token");
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
