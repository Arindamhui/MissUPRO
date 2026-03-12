"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, UserCog, PhoneCall, Gift, Layers, BarChart3, DollarSign,
  CreditCard, Shield, Bell, Settings, Tv, Gamepad2, AudioLines, PartyPopper,
  Megaphone, Calendar, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Models", href: "/admin/models", icon: UserCog },
  { label: "Finance", href: "/admin/finance", icon: DollarSign },
  { label: "Gifts", href: "/admin/gifts", icon: Gift },
  { label: "Live Streams", href: "/admin/live", icon: Tv },
  { label: "Group Audio", href: "/admin/group-audio", icon: AudioLines },
  { label: "Party Rooms", href: "/admin/party", icon: PartyPopper },
  { label: "Events", href: "/admin/events", icon: Calendar },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Moderation", href: "/admin/moderation", icon: Shield },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Promotions", href: "/admin/promotions", icon: Megaphone },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar text-white min-h-screen transition-all duration-200",
      collapsed ? "w-16" : "w-64",
    )}>
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && <span className="text-xl font-bold tracking-tight">MissU<span className="text-primary">PRO</span></span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-sidebar-hover">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors",
                active ? "bg-primary text-white" : "text-white/70 hover:bg-sidebar-hover hover:text-white",
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
