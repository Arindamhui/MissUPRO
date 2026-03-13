"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, UserCog, Gift, Layers, BarChart3, DollarSign,
  CreditCard, Shield, Bell, Settings, Tv, Gamepad2, AudioLines, PartyPopper,
  Megaphone, Calendar, ChevronLeft, ChevronRight, Crown, Trophy,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "User Management", href: "/admin/users", icon: Users },
  { label: "Model Verification", href: "/admin/models", icon: UserCog },
  { label: "Wallet & Economy Settings", href: "/admin/finance", icon: DollarSign },
  { label: "Coin Packages", href: "/admin/finance", icon: CreditCard },
  { label: "Gift Catalog", href: "/admin/gifts", icon: Gift },
  { label: "Live Stream Moderation", href: "/admin/live", icon: Tv },
  { label: "Events Management", href: "/admin/events", icon: Calendar },
  { label: "Leaderboards", href: "/admin/leaderboards", icon: Trophy },
  { label: "VIP Management", href: "/admin/vip", icon: Crown },
  { label: "Referral System", href: "/admin/referrals", icon: Users },
  { label: "Group Audio Rooms", href: "/admin/group-audio", icon: AudioLines },
  { label: "Party Rooms", href: "/admin/party", icon: PartyPopper },
  { label: "Campaign Management", href: "/admin/campaigns", icon: Megaphone },
  { label: "Analytics Dashboards", href: "/admin/analytics", icon: BarChart3 },
  { label: "System Settings Editor", href: "/admin/settings", icon: Settings },
  { label: "Feature Flags", href: "/admin/settings", icon: Layers },
  { label: "Moderation", href: "/admin/moderation", icon: Shield },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "flex flex-col bg-slate-900 text-white min-h-screen transition-all duration-200 border-r border-slate-800",
      collapsed ? "w-16" : "w-64",
    )}>
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && <span className="text-xl font-bold tracking-tight">MissU<span className="text-indigo-400">PRO</span></span>}
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
        {!collapsed && <p className="text-xs text-white/40">v1.0.0 Admin Panel</p>}
      </div>
    </aside>
  );
}
