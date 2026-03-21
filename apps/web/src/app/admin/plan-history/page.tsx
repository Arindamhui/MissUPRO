"use client";

import { useMemo, useState } from "react";
import { Crown, History, CalendarDays, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  AdminDataTable, AdminMetricCard, AdminPageHeader, AdminPanelCard, AdminSearchField,
  AdminStatusPill, AdminTabs,
} from "@/features/admin/components/admin-ui";

type SubRow = {
  id: string;
  userId: string;
  tier: string;
  stripeSubscriptionId?: string | null;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string | null;
};

export default function PlanHistoryPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");

  const listQuery = trpc.admin.listVipSubscriptions.useQuery({ limit: 100 }, { retry: false });
  const allRows = (listQuery.data ?? []) as SubRow[];

  const tabbed = allRows.filter((r) => {
    if (tab !== "ALL" && r.status !== tab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [r.userId, r.tier, r.stripeSubscriptionId].some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  const metrics = useMemo(() => ({
    total: allRows.length,
    active: allRows.filter((r) => r.status === "ACTIVE").length,
    cancelled: allRows.filter((r) => r.status === "CANCELLED").length,
    expired: allRows.filter((r) => r.status === "EXPIRED").length,
  }), [allRows]);

  const tabs = [
    { value: "ALL", label: `All (${allRows.length})` },
    { value: "ACTIVE", label: `Active (${metrics.active})` },
    { value: "CANCELLED", label: `Cancelled (${metrics.cancelled})` },
    { value: "EXPIRED", label: `Expired (${metrics.expired})` },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Packages"
        title="Plan History"
        description="VIP subscription records across all users. View active, cancelled, and expired subscriptions."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Subscriptions" value={formatNumber(metrics.total)} icon={History} />
        <AdminMetricCard label="Active Plans" value={formatNumber(metrics.active)} icon={Crown} tone="emerald" />
        <AdminMetricCard label="Cancelled" value={formatNumber(metrics.cancelled)} icon={CalendarDays} tone="amber" />
        <AdminMetricCard label="Expired" value={formatNumber(metrics.expired)} icon={DollarSign} tone="amber" />
      </div>

      <AdminPanelCard
        title="Subscription Records"
        subtitle="Complete VIP subscription history."
        actions={<div className="w-80"><AdminSearchField value={search} onChange={setSearch} placeholder="Search user ID, tier, stripe ID..." /></div>}
      >
        <AdminTabs tabs={tabs} value={tab} onChange={setTab} />
        <AdminDataTable
          rows={tabbed}
          rowKey={(r) => r.id}
          isLoading={listQuery.isLoading}
          emptyMessage="No subscriptions found."
          columns={[
            { key: "userId", label: "User ID", render: (r) => <span className="font-mono text-xs text-slate-600">{r.userId.slice(0, 12)}…</span> },
            { key: "tier", label: "Tier", sortable: true, render: (r) => (
              <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700">{r.tier}</span>
            )},
            { key: "status", label: "Status", sortable: true, render: (r) => <AdminStatusPill value={r.status} /> },
            { key: "currentPeriodStart", label: "Start", sortable: true, render: (r) => formatDate(new Date(r.currentPeriodStart)) },
            { key: "currentPeriodEnd", label: "End", sortable: true, render: (r) => formatDate(new Date(r.currentPeriodEnd)) },
            { key: "stripeSubscriptionId", label: "Stripe ID", render: (r) => r.stripeSubscriptionId ? <span className="font-mono text-[10px] text-slate-400">{r.stripeSubscriptionId}</span> : "—" },
            { key: "cancelledAt", label: "Cancelled", render: (r) => r.cancelledAt ? formatDate(new Date(r.cancelledAt)) : "—" },
          ]}
        />
      </AdminPanelCard>
    </div>
  );
}
