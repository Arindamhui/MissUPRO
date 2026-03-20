import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAgencyRoute = createRouteMatcher(["/agency(.*)"]);

function buildLoginUrl(req: Request, role: "admin" | "agency") {
  const url = new URL("/login", req.url);
  url.searchParams.set("role", role);
  url.searchParams.set("reason", "session_expired");
  return url;
}

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (isAdminRoute(req) && !userId) {
    return NextResponse.redirect(buildLoginUrl(req, "admin"));
  }

  if (isAgencyRoute(req) && !userId) {
    return NextResponse.redirect(buildLoginUrl(req, "agency"));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};