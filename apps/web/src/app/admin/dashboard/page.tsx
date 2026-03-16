"use client";

import { trpc } from "@/lib/trpc";
import { KpiCard, PageHeader, Card, DataTable, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { Users, UserCog, DollarSign, Tv, CreditCard, Gift, PhoneCall } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const stats = trpc.admin.getDashboardStats.useQuery(undefined, { retry: false });
  const revenueQuery = trpc.analytics.getRevenueAnalytics.useQuery(
    { startDate: new Date(Date.now() - 30 * 86400000), endDate: new Date() },
    { retry: false },
  );
  const engagementQuery = trpc.analytics.getEngagementMetrics.useQuery(
    { startDate: new Date(Date.now() - 86400000), endDate: new Date() },
    { retry: false },
  );

  const summary = stats.data ?? {
    totalUsers: 0,
    activeModels: 0,
    todayRevenue: 0,
    liveRooms: 0,
    pendingModelApps: 0,
    pendingWithdrawals: 0,
    todayGifts: 0,
    todayCalls: 0,
  };

  const revenueData = (revenueQuery.data as { dailyRevenue?: unknown[] } | undefined)?.dailyRevenue ?? [];
  const activityData = (engagementQuery.data as { hourlyActivity?: unknown[] } | undefined)?.hourlyActivity ?? [];

  return (
    <>
      <PageHeader title="Dashboard" description="Platform overview and real-time metrics" />

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Users" value={formatNumber(summary.totalUsers)} icon={Users} trend="+12% vs last week" />
        <KpiCard label="Active Models" value={formatNumber(summary.activeModels)} icon={UserCog} />
        <KpiCard label="Today's Revenue" value={formatCurrency(summary.todayRevenue)} icon={DollarSign} trend="+8% vs yesterday" />
        <KpiCard label="Live Rooms" value={formatNumber(summary.liveRooms)} icon={Tv} />
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pending Model Apps" value={formatNumber(summary.pendingModelApps)} icon={UserCog} />
        <KpiCard label="Pending Withdrawals" value={formatNumber(summary.pendingWithdrawals)} icon={CreditCard} />
        <KpiCard label="Today's Gifts" value={formatNumber(summary.todayGifts)} icon={Gift} />
        <KpiCard label="Today's Calls" value={formatNumber(summary.todayCalls)} icon={PhoneCall} />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        <Card title="Revenue (30 days)">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#6C5CE7" fill="#6C5CE7" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="User Activity (24h)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="calls" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="streams" fill="#00B894" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gifts" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Pending Model Applications">
          <ModelAppQueue />
        </Card>
        <Card title="Recent Withdrawal Requests">
          <WithdrawalQueue />
        </Card>
      </div>
    </>
  );
}

function ModelAppQueue() {
  const apps = trpc.admin.listModelApplications.useQuery({ status: "PENDING", limit: 5 }, { retry: false });
  const approveMut = trpc.admin.approveModelApplication.useMutation({ onSuccess: () => void apps.refetch() });
  const rejectMut = trpc.admin.rejectModelApplication.useMutation({ onSuccess: () => void apps.refetch() });
  const rows = (apps.data?.items ?? []) as Record<string, unknown>[];

  return (
    <DataTable
      columns={[
        { key: "id", label: "ID", render: (row) => String(row.id).slice(0, 8) },
        { key: "userId", label: "User", render: (row) => String(row.userId).slice(0, 8) },
        { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status)} /> },
        {
          key: "submittedAt",
          label: "Applied",
          render: (row) => row.submittedAt ? formatDate(String(row.submittedAt)) : "-",
        },
        {
          key: "actions",
          label: "Actions",
          render: (row) => (
            <div className="flex gap-2">
              <button
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => approveMut.mutate({ applicationId: String(row.id) })}
              >
                Approve
              </button>
              <button
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => rejectMut.mutate({ applicationId: String(row.id), reason: "Does not meet verification requirements" })}
              >
                Reject
              </button>
            </div>
          ),
        },
      ]}
      data={rows}
    />
  );
}

function WithdrawalQueue() {
  const withdrawals = trpc.admin.listWithdrawRequests.useQuery({ status: "PENDING", limit: 5 }, { retry: false });
  const processMut = trpc.admin.processWithdrawRequest.useMutation({ onSuccess: () => void withdrawals.refetch() });
  const rows = (withdrawals.data?.items ?? []) as Record<string, unknown>[];

  return (
    <DataTable
      columns={[
        { key: "id", label: "ID", render: (row) => String(row.id).slice(0, 8) },
        {
          key: "modelUserId",
          label: "Model",
          render: (row) => String(row.modelUserId ?? row.userId ?? "").slice(0, 8),
        },
        {
          key: "totalPayoutAmount",
          label: "Amount",
          render: (row) => formatCurrency(Number(row.totalPayoutAmount ?? row.amount ?? 0)),
        },
        { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status)} /> },
        {
          key: "createdAt",
          label: "Requested",
          render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-",
        },
        {
          key: "actions",
          label: "Actions",
          render: (row) => (
            <div className="flex gap-2">
              <button
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => processMut.mutate({ requestId: String(row.id), action: "approve" })}
              >
                Approve
              </button>
              <button
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => processMut.mutate({ requestId: String(row.id), action: "reject", reason: "Insufficient documentation" })}
              >
                Reject
              </button>
            </div>
          ),
        },
      ]}
      data={rows}
    />
  );
}
