"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, Card, KpiCard, Tabs, Select } from "@/components/ui";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { BarChart3, Users, Clock, TrendingUp, DollarSign, Activity } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const dauData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  dau: Math.round(5000 + Math.random() * 10000),
  wau: Math.round(20000 + Math.random() * 30000),
}));

const sessionData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  avgDuration: Math.round(5 + Math.random() * 25),
  sessions: Math.round(100 + Math.random() * 500),
}));

const engagementData = [
  { name: "Calls", value: 35 },
  { name: "Gifts", value: 25 },
  { name: "Streams", value: 20 },
  { name: "Chat", value: 15 },
  { name: "Games", value: 5 },
];

const COLORS = ["#6C5CE7", "#00B894", "#FF6B6B", "#FDCB6E", "#E17055"];

const revenueSourceData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  coinSales: Math.round(3000 + Math.random() * 7000),
  giftRevenue: Math.round(2000 + Math.random() * 5000),
  vipSubs: Math.round(500 + Math.random() * 2000),
  callFees: Math.round(1000 + Math.random() * 3000),
}));

export default function AnalyticsPage() {
  const [tab, setTab] = useState("engagement");
  const [dateRange, setDateRange] = useState("30d");

  const engagement = trpc.analytics.engagementMetrics.useQuery(undefined, { retry: false });
  const revenue = trpc.analytics.revenueAnalytics.useQuery(undefined, { retry: false });

  return (
    <>
      <PageHeader
        title="Analytics"
        description="User engagement, revenue, and platform metrics"
        actions={
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="DAU" value={formatNumber(engagement.data?.dau ?? 8540)} icon={Users} trend="+5.2%" />
        <KpiCard label="Avg Session" value="18 min" icon={Clock} />
        <KpiCard label="Revenue (30d)" value={formatCurrency(revenue.data?.totalRevenue ?? 342000)} icon={DollarSign} />
        <KpiCard label="Retention (D7)" value="42%" icon={TrendingUp} />
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
                <Pie data={engagementData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {engagementData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
              {[
                { label: "Coin Sales", value: 182000, color: "bg-primary" },
                { label: "Gift Revenue", value: 95000, color: "bg-success" },
                { label: "VIP Subscriptions", value: 34000, color: "bg-accent" },
                { label: "Call Fees", value: 31000, color: "bg-warning" },
              ].map((item) => (
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
