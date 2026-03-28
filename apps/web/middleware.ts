import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "missu_access_token";
const WEB_AUTH_COOKIE = "missu_auth_token";

const ADMIN_ROUTES = ["/admin"];
const AGENCY_ROUTES = ["/agency"];
const AUTH_ROUTES = ["/admin-login", "/agency-login", "/agency-signup", "/login", "/signup"];
const PUBLIC_ROUTES = ["/", "/api/", "/auth/", "/_next/", "/brand/", "/favicon"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route));
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(route));
}

function isAdminRoute(pathname: string) {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

function isAgencyRoute(pathname: string) {
  return AGENCY_ROUTES.some((route) => pathname.startsWith(route));
}

function hasAuthToken(request: NextRequest) {
  return Boolean(
    request.cookies.get(AUTH_COOKIE)?.value ||
    request.cookies.get(WEB_AUTH_COOKIE)?.value,
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public and API routes through
  if (isPublicRoute(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  const isAuthenticated = hasAuthToken(request);

  // If on auth page but already authenticated, redirect based on cookie presence
  // (Detailed role check happens in the layout server components)
  if (isAuthRoute(pathname) && isAuthenticated) {
    // Let the page component handle the redirect based on role
    return addSecurityHeaders(NextResponse.next());
  }

  // Protected routes require authentication
  if ((isAdminRoute(pathname) || isAgencyRoute(pathname)) && !isAuthenticated) {
    const loginUrl = isAdminRoute(pathname) ? "/admin-login" : "/agency-login";
    const url = request.nextUrl.clone();
    url.pathname = loginUrl;
    url.searchParams.set("reason", "session_expired");
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return addSecurityHeaders(NextResponse.next());
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon\\.ico|brand/|public/).*)",
  ],
};
