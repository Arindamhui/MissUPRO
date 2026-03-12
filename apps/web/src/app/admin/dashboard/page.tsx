"use client";
import { trpc } from "@/lib/trpc";
import { KpiCard, PageHeader, Card, DataTable, StatusBadge } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Users, UserCog, DollarSign, Tv, TrendingUp, CreditCard, Gift, PhoneCall } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// Revenue chart mock (will be replaced with real API data)
const revenueData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  revenue: Math.round(5000 + Math.random() * 15000),
  users: Math.round(200 + Math.random() * 800),
}));

const activityData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  calls: Math.round(10 + Math.random() * 90),
  streams: Math.round(5 + Math.random() * 50),
  gifts: Math.round(20 + Math.random() * 100),
}));

export default function DashboardPage() {
  const stats = trpc.admin.dashboardStats.useQuery(undefined, { retry: false });

  const s = stats.data ?? {
    totalUsers: 0, activeModels: 0, todayRevenue: 0, liveRooms: 0,
    pendingModelApps: 0, pendingWithdrawals: 0, todayGifts: 0, todayCalls: 0,
  };

  return (
    <>
      <PageHeader title="Dashboard" description="Platform overview and real-time metrics" />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Users" value={formatNumber(s.totalUsers)} icon={Users} trend="+12% vs last week" />
        <KpiCard label="Active Models" value={formatNumber(s.activeModels)} icon={UserCog} />
        <KpiCard label="Today's Revenue" value={formatCurrency(s.todayRevenue)} icon={DollarSign} trend="+8% vs yesterday" />
        <KpiCard label="Live Rooms" value={formatNumber(s.liveRooms)} icon={Tv} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Pending Model Apps" value={s.pendingModelApps} icon={UserCog} />
        <KpiCard label="Pending Withdrawals" value={s.pendingWithdrawals} icon={CreditCard} />
        <KpiCard label="Today's Gifts" value={formatNumber(s.todayGifts)} icon={Gift} />
        <KpiCard label="Today's Calls" value={formatNumber(s.todayCalls)} icon={PhoneCall} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

      {/* Priority Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
  const apps = trpc.admin.listModelApplications.useQuery({ status: "submitted", limit: 5 }, { retry: false });
  const rows = (apps.data?.applications ?? []) as Record<string, unknown>[];
  return (
    <DataTable
      columns={[
        { key: "id", label: "ID" },
        { key: "userId", label: "User" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
        { key: "createdAt", label: "Applied" },
      ]}
      data={rows}
    />
  );
}

function WithdrawalQueue() {
  const withdrawals = trpc.admin.listWithdrawals.useQuery({ status: "pending", limit: 5 }, { retry: false });
  const rows = (withdrawals.data?.requests ?? []) as Record<string, unknown>[];
  return (
    <DataTable
      columns={[
        { key: "id", label: "ID" },
        { key: "userId", label: "User" },
        { key: "amount", label: "Amount", render: (r) => formatCurrency(Number(r.amount ?? 0)) },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
      ]}
      data={rows}
    />
  );
}
