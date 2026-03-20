"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Building2, BarChart3, CreditCard, Settings, Users, ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const NAV = [
  { label: "Dashboard", href: "/agency/dashboard", icon: LayoutDashboard },
  { label: "Models", href: "/agency/models", icon: Users },
  { label: "Payments", href: "/agency/payments", icon: CreditCard },
  { label: "Analytics", href: "/agency/analytics", icon: BarChart3 },
  { label: "Settings", href: "/agency/settings", icon: Settings },
];

export function AgencySidebar() {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col bg-slate-900 text-white min-h-screen transition-all duration-200 border-r border-slate-800",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Image
              src="/brand/missu-pro-web-logo.png"
              alt="MissU Pro"
              width={170}
              height={56}
              className="h-10 w-auto"
              priority
            />
            <span className="text-xs text-white/50 border border-white/10 rounded-full px-2 py-0.5">
              Agency
            </span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-slate-800">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = currentPath.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors",
                active ? "bg-indigo-600 text-white" : "text-white/70 hover:bg-slate-800 hover:text-white",
              )}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className={cn(collapsed && "hidden")}>
            <div className="text-xs text-white/40">MissU Pro Agency Panel</div>
            <Link href="/discover" className="text-xs text-white/60 hover:text-white">
              Back to Discover
            </Link>
          </div>
          <div className={cn(collapsed ? "" : "ml-auto")}>
            <UserButton />
          </div>
        </div>
      </div>
    </aside>
  );
}

