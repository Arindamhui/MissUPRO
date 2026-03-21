import { NextResponse } from "next/server";
import { WEB_AUTH_COOKIE_NAME } from "@/lib/web-auth";

/** Routes that require admin auth — exclude public auth pages */
function isProtectedAdminRoute(pathname: string) {
  if (
    pathname === "/admin-login" ||
    pathname === "/admin-login/" ||
    pathname.startsWith("/admin-login?")
  ) {
    return false;
  }
  return pathname.startsWith("/admin");
}

/** Routes that require agency auth — exclude public auth pages */
function isProtectedAgencyRoute(pathname: string) {
  if (
    pathname === "/agency-login" ||
    pathname === "/agency-login/" ||
    pathname.startsWith("/agency-login?") ||
    pathname === "/agency-signup" ||
    pathname === "/agency-signup/" ||
    pathname.startsWith("/agency-signup?")
  ) {
    return false;
  }
  return pathname.startsWith("/agency");
}

function buildLoginUrl(req: Request, role: "admin" | "agency") {
  const url = new URL(role === "admin" ? "/admin-login" : "/agency-login", req.url);
  url.searchParams.set("reason", "session_expired");
  return url;
}

export default function proxy(req: any) {
  const token = req.cookies.get(WEB_AUTH_COOKIE_NAME)?.value;
  const pathname = req.nextUrl.pathname as string;

  if (isProtectedAdminRoute(pathname) && !token) {
    return NextResponse.redirect(buildLoginUrl(req, "admin"));
  }

  if (isProtectedAgencyRoute(pathname) && !token) {
    return NextResponse.redirect(buildLoginUrl(req, "agency"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};