"use client";

import { useState } from "react";
import {
  Award, BadgeDollarSign, Ban, Building2, Coins, Crown, DollarSign, Eye,
  RadioTower, ShieldCheck, Users, Wallet,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  AdminButton, AdminDataTable, AdminMetricCard, AdminPageHeader, AdminPanelCard,
  AdminSelect, AdminStatusPill,
} from "@/features/admin/components/admin-ui";
import { useAdminDashboardData, useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";
import { useAuthBridge } from "@/components/auth-bridge";

type ModelApplicationRow = { id: string; userId: string; status: string; submittedAt?: string | Date };
type WithdrawalRow = { id: string; modelUserId?: string | null; userId?: string | null; totalPayoutAmount?: number; amount?: number; status: string; createdAt?: string | Date };
type RevenuePoint = { day?: string; date?: string; revenue?: number; giftRevenue?: number };
type EngagementPoint = { date?: string; day?: string; dailyActiveUsers?: number; streams?: number; newUsers?: number };

export default function AdminDashboardPage() {
  const notify = useAdminNotifier();
  const auth = useAuthBridge();
  const { stats, finances, revenue } = useAdminDashboardData();
  const fullStats = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const token = await auth.getToken();
      const res = await fetch("/api/admin/dashboard-stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      const json = await res.json();
      return json.data as Record<string, number>;
    },
    retry: false,
  });
  const engagement = trpc.analytics.getEngagementMetrics.useQuery(
    { startDate: new Date(Date.now() - 14 * 86400000), endDate: new Date() },
    { retry: false },
  );
  const modelApplications = trpc.admin.listModelApplications.useQuery({ status: "PENDING", limit: 5 }, { retry: false });
  const withdrawals = trpc.admin.listWithdrawRequests.useQuery({ status: "PENDING", limit: 5 }, { retry: false });
  const approveApplication = trpc.admin.approveModelApplication.useMutation({
    onSuccess: async () => { notify.success("Host approved"); await Promise.all([modelApplications.refetch(), stats.refetch(), fullStats.refetch()]); },
    onError: (error: Error) => notify.error("Approval failed", error.message),
  });
  const rejectApplication = trpc.admin.rejectModelApplication.useMutation({
    onSuccess: async () => { notify.success("Application rejected"); await Promise.all([modelApplications.refetch(), stats.refetch()]); },
    onError: (error: Error) => notify.error("Rejection failed", error.message),
  });
  const processWithdrawal = trpc.admin.processWithdrawRequest.useMutation({
    onSuccess: async (_result: unknown, variables: { action: "approve" | "reject" }) => { notify.success(variables.action === "approve" ? "Approved" : "Rejected"); await Promise.all([withdrawals.refetch(), finances.refetch()]); },
    onError: (error: Error) => notify.error("Action failed", error.message),
  });

  const d = fullStats.data;
  const revenueData = ((revenue.data?.dailyRevenue ?? []) as RevenuePoint[]).map((p) => ({
    label: p.day ?? p.date ?? "-", revenue: Number(p.revenue ?? 0), giftRevenue: Number(p.giftRevenue ?? 0),
  }));
  const engagementData = ((engagement.data?.dailyActiveUsers ?? []) as EngagementPoint[]).map((p) => ({
    label: p.date ?? p.day ?? "-", activeUsers: Number(p.dailyActiveUsers ?? 0), streams: Number(p.streams ?? 0), newUsers: Number(p.newUsers ?? 0),
  }));
  const applicationRows = (modelApplications.data?.items ?? []) as ModelApplicationRow[];
  const withdrawalRows = (withdrawals.data?.items ?? []) as WithdrawalRow[];
  const [dateRange, setDateRange] = useState("30d");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Welcome Admin!</h1>
          <h2 className="mt-1 text-lg font-semibold text-slate-700">Dashboard</h2>
        </div>
        <AdminSelect value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="all">All Time</option>
        </AdminSelect>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Users" value={formatNumber(d?.totalUsers ?? 0)} icon={Users} hint="All registered accounts" />
        <AdminMetricCard label="Total Block User" value={formatNumber(d?.totalBlockedUsers ?? 0)} icon={Ban} hint="Banned / suspended" />
        <AdminMetricCard label="Total VIP User" value={formatNumber(d?.totalVipUsers ?? 0)} icon={Crown} tone="amber" hint="Active VIP subscribers" />
        <AdminMetricCard label="Total Agency" value={formatNumber(d?.totalAgencies ?? 0)} icon={Building2} tone="sky" hint="Approved agencies" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Pending Host" value={formatNumber(d?.pendingHosts ?? 0)} icon={ShieldCheck} tone="amber" hint="Awaiting review" />
        <AdminMetricCard label="Total Host" value={formatNumber(d?.totalHosts ?? 0)} icon={ShieldCheck} tone="emerald" hint="Approved hosts" />
        <AdminMetricCard label="Total Impressions" value={formatNumber(d?.totalImpressions ?? 0)} icon={Eye} hint="Gift impressions" />
        <AdminMetricCard label="Total Current Live Host" value={formatNumber(d?.currentLiveHosts ?? 0)} icon={RadioTower} tone="sky" hint="Streaming now" />
      </div>

      <h2 className="text-lg font-semibold text-slate-800 pt-2">Admin Revenue</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Revenue" value={`$ ${formatNumber(d?.totalRevenue ?? 0)}`} icon={DollarSign} tone="emerald" hint="Gross payments collected" />
        <AdminMetricCard label="Coins Sold" value={formatNumber(d?.coinsSold ?? 0)} icon={Coins} tone="amber" hint="Total in-app coins purchased" />
        <AdminMetricCard label="Admin Commission Earned" value={formatNumber(d?.adminCommissionEarned ?? 0)} icon={Award} hint="Platform commission income" />
        <AdminMetricCard label="Host Earnings Generated" value={formatNumber(d?.hostEarningsGenerated ?? 0)} icon={Wallet} tone="sky" hint="Total host income created" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AdminMetricCard label="Host Payouts Complete" value={`$ ${formatNumber(d?.hostPayoutsComplete ?? 0)}`} icon={BadgeDollarSign} tone="emerald" hint={`${formatNumber(d?.hostPayoutsCompleteCount ?? 0)} settled`} />
        <AdminMetricCard label="Pending Payout Liability" value={`$ ${formatNumber(d?.pendingPayoutLiability ?? 0)}`} icon={BadgeDollarSign} tone="amber" hint={`${formatNumber(d?.pendingPayoutCount ?? 0)} pending`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanelCard title="Revenue Pulse" subtitle="Daily revenue and gift contribution.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} fill="url(#revenueFill)" />
                <Area type="monotone" dataKey="giftRevenue" stroke="#d97706" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminPanelCard>

        <AdminPanelCard title="Engagement Motion" subtitle="User activity and creator output.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatNumber(Number(value))} />
                <Bar dataKey="activeUsers" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                <Bar dataKey="streams" fill="#0284c7" radius={[8, 8, 0, 0]} />
                <Bar dataKey="newUsers" fill="#16a34a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminPanelCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanelCard title="Pending Host Applications" subtitle="Fast approval lane.">
          <AdminDataTable
            rows={applicationRows}
            rowKey={(row) => row.id}
            isLoading={modelApplications.isLoading}
            emptyMessage="No applications waiting."
            columns={[
              { key: "id", label: "ID", render: (row) => <span className="font-mono text-xs">{row.id.slice(0, 8)}</span> },
              { key: "userId", label: "User", render: (row) => <span className="font-mono text-xs">{row.userId.slice(0, 8)}</span> },
              { key: "status", label: "Status", render: (row) => <AdminStatusPill value={row.status} /> },
              { key: "submittedAt", label: "Date", render: (row) => row.submittedAt ? formatDate(row.submittedAt) : "-" },
              { key: "actions", label: "", render: (row) => (
                <div className="flex gap-2">
                  <AdminButton onClick={() => approveApplication.mutate({ applicationId: row.id })} disabled={approveApplication.isPending}>Approve</AdminButton>
                  <AdminButton variant="danger" onClick={() => rejectApplication.mutate({ applicationId: row.id, reason: "Rejected" })} disabled={rejectApplication.isPending}>Reject</AdminButton>
                </div>
              )},
            ]}
          />
        </AdminPanelCard>

        <AdminPanelCard title="Withdrawal Queue" subtitle="Payout requests awaiting review.">
          <AdminDataTable
            rows={withdrawalRows}
            rowKey={(row) => row.id}
            isLoading={withdrawals.isLoading}
            emptyMessage="No pending withdrawals."
            columns={[
              { key: "id", label: "ID", render: (row) => <span className="font-mono text-xs">{row.id.slice(0, 8)}</span> },
              { key: "userId", label: "User", render: (row) => <span className="font-mono text-xs">{String(row.modelUserId ?? row.userId ?? "-").slice(0, 8)}</span> },
              { key: "amount", label: "Amount", render: (row) => formatCurrency(Number(row.totalPayoutAmount ?? row.amount ?? 0)) },
              { key: "status", label: "Status", render: (row) => <AdminStatusPill value={row.status} /> },
              { key: "actions", label: "", render: (row) => (
                <div className="flex gap-2">
                  <AdminButton onClick={() => processWithdrawal.mutate({ requestId: row.id, action: "approve" })} disabled={processWithdrawal.isPending}>Approve</AdminButton>
                  <AdminButton variant="danger" onClick={() => processWithdrawal.mutate({ requestId: row.id, action: "reject", reason: "Rejected" })} disabled={processWithdrawal.isPending}>Reject</AdminButton>
                </div>
              )},
            ]}
          />
        </AdminPanelCard>
      </div>
    </div>
  );
}
