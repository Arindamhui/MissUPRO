"use client";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, Card, KpiCard, Tabs, Select } from "@/components/ui";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { BarChart3, Users, Clock, TrendingUp, DollarSign, Activity } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const CHART_COLORS = ["#6C5CE7", "#00B894", "#FF6B6B", "#FDCB6E", "#E17055"];

const RANGE_MAP: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export default function AnalyticsPage() {
  const [tab, setTab] = useState("engagement");
  const [dateRange, setDateRange] = useState("30d");

  const days = RANGE_MAP[dateRange] ?? 30;
  const startDate = useMemo(() => new Date(Date.now() - days * 86400000), [days]);
  const endDate = useMemo(() => new Date(), []);

  const engagement = trpc.analytics.getEngagementMetrics.useQuery(
    { startDate, endDate },
    { retry: false },
  );
  const revenue = trpc.analytics.getRevenueAnalytics.useQuery(
    { startDate, endDate },
    { retry: false },
  );

  const engData = engagement.data as any ?? {};
  const revData = revenue.data as any ?? {};

  const dauData = engData.dauTrend ?? [];
  const sessionData = engData.hourlyActivity ?? [];
  const engagementBreakdown = engData.featureBreakdown ?? [
    { name: "Calls", value: 35 },
    { name: "Gifts", value: 25 },
    { name: "Streams", value: 20 },
    { name: "Chat", value: 15 },
    { name: "Games", value: 5 },
  ];
  const revenueSourceData = revData.dailyRevenue ?? [];
  const revenueSummary = revData.summary ?? [];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="User engagement, revenue, and platform metrics"
        actions={
          <Select
            value={dateRange}
            onChange={(e: any) => setDateRange(typeof e === "string" ? e : e.target.value)}
            options={[
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="DAU" value={formatNumber(engData.dau ?? 0)} icon={Users} trend={engData.dauTrend?.length ? `${days}d data` : undefined} />
        <KpiCard label="Avg Session" value={engData.avgSessionMinutes ? `${engData.avgSessionMinutes} min` : "-"} icon={Clock} />
        <KpiCard label={`Revenue (${dateRange})`} value={formatCurrency(revData.totalRevenue ?? 0)} icon={DollarSign} />
        <KpiCard label="Retention (D7)" value={engData.d7Retention ? `${engData.d7Retention}%` : "-"} icon={TrendingUp} />
      </div>

      <Tabs
        tabs={[
          { id: "engagement", label: "Engagement" },
          { id: "revenue", label: "Revenue" },
          { id: "retention", label: "Retention" },
          { id: "features", label: "Feature Usage" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "engagement" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="DAU / WAU Trend">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dauData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="dau" stroke="#6C5CE7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wau" stroke="#00B894" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Hourly Sessions & Duration">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sessionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sessions" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Engagement by Feature">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={engagementBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {engagementBreakdown.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Call Volume (24h)">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={sessionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="sessions" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {tab === "revenue" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Revenue by Source (30d)">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueSourceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="coinSales" stackId="1" stroke="#6C5CE7" fill="#6C5CE7" fillOpacity={0.3} />
                <Area type="monotone" dataKey="giftRevenue" stackId="1" stroke="#00B894" fill="#00B894" fillOpacity={0.3} />
                <Area type="monotone" dataKey="vipSubs" stackId="1" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.3} />
                <Area type="monotone" dataKey="callFees" stackId="1" stroke="#FDCB6E" fill="#FDCB6E" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Revenue Summary">
            <div className="space-y-3">
              {(revenueSummary.length ? revenueSummary : [
                { label: "Coin Sales", value: revData.coinSales ?? 0, color: "bg-primary" },
                { label: "Gift Revenue", value: revData.giftRevenue ?? 0, color: "bg-success" },
                { label: "VIP Subscriptions", value: revData.vipRevenue ?? 0, color: "bg-accent" },
                { label: "Call Fees", value: revData.callRevenue ?? 0, color: "bg-warning" },
              ]).map((item: any) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "retention" && (
        <Card title="Retention Curves">
          <p className="text-sm text-muted-foreground">Cohort based retention curves — D1, D7, D14, D30 breakdown</p>
        </Card>
      )}

      {tab === "features" && (
        <Card title="Feature Usage Breakdown">
          <p className="text-sm text-muted-foreground">Per-feature DAU, session time, and conversion metrics</p>
        </Card>
      )}
    </>
  );
}
