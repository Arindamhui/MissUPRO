"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, KpiCard, PageHeader, Select, Tabs } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DollarSign, MessageSquare, Radio, PhoneCall, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RANGE_MAP: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export default function AnalyticsPage() {
  const [tab, setTab] = useState("engagement");
  const [dateRange, setDateRange] = useState("30d");

  const days = RANGE_MAP[dateRange] ?? 30;
  const startDate = useMemo(() => new Date(Date.now() - days * 86400000), [days]);
  const endDate = new Date();

  const engagementQuery = trpc.analytics.getEngagementMetrics.useQuery({ startDate, endDate }, { retry: false, staleTime: 60_000 });
  const revenueQuery = trpc.analytics.getRevenueAnalytics.useQuery({ startDate, endDate }, { retry: false, staleTime: 60_000 });

  const engagement = (engagementQuery.data ?? {
    dailyActiveUsers: [],
    calls: { count: 0, totalDurationSeconds: 0 },
    chats: { count: 0 },
    streams: { count: 0, totalViewers: 0 },
    newUsers: 0,
  }) as {
    dailyActiveUsers: Array<{ date: string; count: number }>;
    calls: { count: number; totalDurationSeconds: number };
    chats: { count: number };
    streams: { count: number; totalViewers: number };
    newUsers: number;
  };

  const revenue = (revenueQuery.data ?? {
    dailyRevenue: [],
    giftRevenue: { total: 0, count: 0 },
    totalCoinsPurchased: 0,
  }) as {
    dailyRevenue: Array<{ date: string; total: number; count: number }>;
    giftRevenue: { total: number; count: number };
    totalCoinsPurchased: number;
  };

  const totalRevenue = revenue.dailyRevenue.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const averageCallMinutes = engagement.calls.count > 0
    ? Math.round((engagement.calls.totalDurationSeconds / 60 / engagement.calls.count) * 10) / 10
    : 0;

  const engagementMix = [
    { label: "Calls", value: Number(engagement.calls.count ?? 0) },
    { label: "Chats", value: Number(engagement.chats.count ?? 0) },
    { label: "Streams", value: Number(engagement.streams.count ?? 0) },
    { label: "New Users", value: Number(engagement.newUsers ?? 0) },
  ];

  return (
    <>
      <PageHeader
        title="Analytics Dashboard"
        description="Operational engagement and revenue visibility based on the current analytics service outputs."
        actions={
          <Select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            options={[
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
            ]}
          />
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="New Users" value={formatNumber(engagement.newUsers)} icon={Users} trend={`${days}d window`} />
        <KpiCard label="Calls" value={formatNumber(engagement.calls.count)} icon={PhoneCall} trend={`${averageCallMinutes} min avg`} />
        <KpiCard label="Chats" value={formatNumber(engagement.chats.count)} icon={MessageSquare} />
        <KpiCard label="Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} />
      </div>

      <Tabs
        tabs={[
          { id: "engagement", label: "Engagement" },
          { id: "revenue", label: "Revenue" },
          { id: "activity", label: "Activity Mix" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "engagement" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Daily Active Users">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={engagement.dailyActiveUsers}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#0f766e" fill="#0f766e" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Engagement Summary">
            <div className="grid gap-3 md:grid-cols-2">
              <MetricCard label="Total Calls" value={formatNumber(engagement.calls.count)} />
              <MetricCard label="Call Duration" value={`${formatNumber(Math.round(engagement.calls.totalDurationSeconds / 60))} min`} />
              <MetricCard label="Chat Sessions" value={formatNumber(engagement.chats.count)} />
              <MetricCard label="Stream Sessions" value={formatNumber(engagement.streams.count)} />
              <MetricCard label="Stream Viewers" value={formatNumber(engagement.streams.totalViewers)} />
              <MetricCard label="New Users" value={formatNumber(engagement.newUsers)} />
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "revenue" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Daily Payment Revenue">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenue.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#b45309" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Revenue Summary">
            <div className="space-y-3 text-sm">
              <SummaryRow label="Completed payment revenue" value={formatCurrency(totalRevenue)} />
              <SummaryRow label="Gift revenue (coins)" value={formatNumber(revenue.giftRevenue.total)} />
              <SummaryRow label="Gift transactions" value={formatNumber(revenue.giftRevenue.count)} />
              <SummaryRow label="Coins purchased" value={formatNumber(revenue.totalCoinsPurchased)} />
              <SummaryRow label="Payment records" value={formatNumber(revenue.dailyRevenue.reduce((sum, row) => sum + Number(row.count ?? 0), 0))} />
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Activity Mix">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementMix} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Operational Notes">
            <div className="space-y-3 text-sm">
              <SummaryRow label="Average call length" value={`${averageCallMinutes} min`} />
              <SummaryRow label="Streams recorded" value={formatNumber(engagement.streams.count)} />
              <SummaryRow label="Viewer peaks summed" value={formatNumber(engagement.streams.totalViewers)} />
              <SummaryRow label="Date window" value={`${days} days`} />
              <div className="rounded-lg border p-3 text-muted-foreground">
                This screen intentionally reflects only the metrics currently produced by the backend analytics service. It avoids fabricated retention and cohort views that the API does not yet expose.
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
