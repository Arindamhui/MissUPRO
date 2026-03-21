"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award, BadgeDollarSign, Bell, BookOpenCheck, Building2, CalendarCheck, Coins,
  CreditCard, FileBarChart, Flag, Gift, Globe, LayoutDashboard,
  LogOut, Menu, MessageSquareWarning, Settings, Shield, ShieldCheck, Sparkles,
  Tag, UserCog, UserRoundCheck, Users, Wallet, X,
} from "lucide-react";
import { useAuthBridge } from "@/components/auth-bridge";
import { cn } from "@/lib/utils";
import { useAdminPanelStore } from "@/stores/admin-panel-store";

type NavSection = { label: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] };

const sections: NavSection[] = [
  {
    label: "GENERAL",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "User", icon: Users },
    ],
  },
  {
    label: "HOST & AGENCY",
    items: [
      { href: "/admin/agencies", label: "Agency", icon: Building2 },
      { href: "/admin/hosts", label: "Host", icon: ShieldCheck },
      { href: "/admin/host-requests", label: "Host Request", icon: UserRoundCheck },
      { href: "/admin/host-tags", label: "Host Tags", icon: Tag },
    ],
  },
  {
    label: "STAFF MANAGEMENT",
    items: [
      { href: "/admin/roles", label: "Roles", icon: Shield },
      { href: "/admin/sub-admin", label: "Sub Admin", icon: UserCog },
    ],
  },
  {
    label: "GIFT & REWARDS",
    items: [
      { href: "/admin/gifts", label: "Gift", icon: Gift },
      { href: "/admin/daily-checkin", label: "Daily CheckIn", icon: CalendarCheck },
    ],
  },
  {
    label: "PACKAGES",
    items: [
      { href: "/admin/coin-packages", label: "Coin Packages", icon: Coins },
      { href: "/admin/vip", label: "VIP Plan Benefits", icon: Sparkles },
      { href: "/admin/plan-history", label: "Plan History", icon: BookOpenCheck },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { href: "/admin/wallet", label: "Wallet", icon: Wallet },
      { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
      { href: "/admin/payouts", label: "Withdrawal", icon: BadgeDollarSign },
      { href: "/admin/commission", label: "Commission", icon: Award },
    ],
  },
  {
    label: "REPORTS & ISSUES",
    items: [
      { href: "/admin/moderation", label: "Report Reason", icon: MessageSquareWarning },
      { href: "/admin/fraud", label: "Report", icon: Flag },
    ],
  },
  {
    label: "SETTING",
    items: [
      { href: "/admin/settings", label: "Setting", icon: Settings },
      { href: "/admin/feature-flags", label: "Feature Flags", icon: Globe },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuthBridge();
  const {
    sidebarCollapsed,
    mobileSidebarOpen,
    toggleSidebar,
    setMobileSidebarOpen,
  } = useAdminPanelStore();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] text-slate-950">
      <div className="flex min-h-screen">
        <button className={cn("fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm lg:hidden", mobileSidebarOpen ? "block" : "hidden")} onClick={() => setMobileSidebarOpen(false)} />
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-slate-200 bg-white/90 backdrop-blur-xl transition-all duration-300 lg:static",
          sidebarCollapsed ? "w-[94px]" : "w-[290px]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}>
          <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
            <div className={cn("overflow-hidden transition-all", sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">MissU Pro</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">Admin Control</p>
            </div>
            <button className="rounded-2xl bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200 lg:hidden" onClick={() => setMobileSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {sections.map((section) => (
              <div key={section.label}>
                <p className={cn(
                  "mb-1.5 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/80",
                  sidebarCollapsed ? "sr-only" : undefined,
                )}>{section.label}</p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname?.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                          active ? "bg-violet-600 text-white shadow-[0_8px_24px_-8px_rgba(124,58,237,0.5)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                          sidebarCollapsed ? "justify-center px-2" : undefined,
                        )}
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span className={cn("truncate transition-all", sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-200 p-4 space-y-2">
            <div className={cn("rounded-[24px] bg-violet-600 p-4 text-white", sidebarCollapsed ? "px-3" : undefined)}>
              <p className={cn("text-xs uppercase tracking-[0.22em] text-white/60", sidebarCollapsed ? "sr-only" : undefined)}>Signed in</p>
              <p className={cn("mt-1 text-sm font-semibold", sidebarCollapsed ? "hidden" : undefined)}>{auth.displayName ?? auth.email ?? "Administrator"}</p>
              <p className={cn("text-xs text-white/65", sidebarCollapsed ? "hidden" : undefined)}>{auth.email ?? ""}</p>
            </div>
            <button
              onClick={() => auth.signOut()}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition",
                sidebarCollapsed ? "justify-center px-2" : undefined,
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span className={cn("truncate", sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>LogOut</span>
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button className="rounded-2xl bg-white p-2 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50" onClick={() => setMobileSidebarOpen(true)}>
                  <Menu className="h-5 w-5 lg:hidden" />
                  <span className="sr-only">Open menu</span>
                </button>
                <button className="hidden rounded-2xl bg-white p-2 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 lg:inline-flex" onClick={toggleSidebar}>
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Operations</p>
                  <p className="text-sm font-medium text-slate-900">Realtime admin workspace</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 lg:flex">{auth.email ?? "admin@missu.pro"}</div>
                <button className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50">
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
