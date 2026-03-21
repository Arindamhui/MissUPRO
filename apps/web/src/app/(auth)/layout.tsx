"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Admin login, agency login, and agency signup render their own full-page layouts
  if (pathname === "/admin-login" || pathname === "/agency-login" || pathname === "/agency-signup") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,107,61,0.12),_transparent_32%),linear-gradient(180deg,#fffaf7_0%,#f7f8fc_52%,#eef2f7_100%)]">
      <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/missu-pro-web-logo.png"
              alt="MissU Pro"
              width={220}
              height={72}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/agency-login" className="text-slate-600 hover:text-slate-950">
              Agency Login
            </Link>
            <Link href="/agency-signup" className="text-slate-600 hover:text-slate-950">
              Agency Signup
            </Link>
            <Link href="/admin-login" className="text-[#ff6b3d] hover:underline">
              Admin Access
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="hidden lg:block pt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff6b3d]">App auth + DB roles</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 mt-3">
              Secure access for agencies and platform operators.
            </h1>
            <p className="mt-4 text-slate-600 max-w-lg leading-7">
              Identity lives in the MissU auth service. Authorization lives in PostgreSQL. Every admin and agency session is revalidated against the backend before protected UI or APIs are allowed through.
            </p>

            <div className="mt-8 grid gap-4 max-w-lg">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                <div className="font-semibold text-slate-950">Agency onboarding</div>
                <div className="text-sm text-slate-600 mt-2 leading-6">
                  New agency accounts create a MissU account first, then complete their agency profile before entering the dashboard.
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                <div className="font-semibold text-slate-950">Admin allowlist</div>
                <div className="text-sm text-slate-600 mt-2 leading-6">
                  Admin sign-in is restricted to approved email addresses and denied immediately if the database role does not match the session.
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                <div className="font-semibold text-slate-950">No frontend trust</div>
                <div className="text-sm text-slate-600 mt-2 leading-6">
                  Route layouts, middleware, and tRPC procedures all validate the active app session against the DB-backed auth role.
                </div>
              </div>
            </div>
          </div>

          <div className="w-full flex justify-center">
            <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

