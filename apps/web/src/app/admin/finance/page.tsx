"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, KpiCard, Tabs, Modal } from "@/components/ui";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { DollarSign, CreditCard, TrendingUp, ArrowDownToLine } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const revenueByDay = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  coins: Math.round(2000 + Math.random() * 8000),
  gifts: Math.round(1000 + Math.random() * 5000),
  calls: Math.round(500 + Math.random() * 3000),
}));

export default function FinancePage() {
  const [tab, setTab] = useState("overview");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);

  const overview = trpc.admin.financialOverview.useQuery(undefined, { retry: false });
  const withdrawals = trpc.admin.listWithdrawals.useQuery({ status: tab === "withdrawals" ? "pending" : undefined, limit: 20 }, { retry: false });

  const ov = overview.data ?? { totalRevenue: 0, monthRevenue: 0, weekRevenue: 0, todayRevenue: 0, pendingPayouts: 0, payoutCount: 0 };
  const wRows = (withdrawals.data?.requests ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Finance"
        description="Revenue overview, payment history, and withdrawal management"
        actions={<Button variant="secondary" size="sm">Export CSV</Button>}
      />

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Revenue" value={formatCurrency(ov.totalRevenue)} icon={DollarSign} />
        <KpiCard label="This Month" value={formatCurrency(ov.monthRevenue)} icon={TrendingUp} />
        <KpiCard label="This Week" value={formatCurrency(ov.weekRevenue)} icon={TrendingUp} />
        <KpiCard label="Pending Payouts" value={formatCurrency(ov.pendingPayouts)} icon={ArrowDownToLine} />
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Revenue Overview" },
          { id: "payments", label: "Payment History" },
          { id: "withdrawals", label: "Withdrawals" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Daily Revenue (30d)">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="coins" stackId="1" stroke="#6C5CE7" fill="#6C5CE7" fillOpacity={0.3} />
                <Area type="monotone" dataKey="gifts" stackId="1" stroke="#00B894" fill="#00B894" fillOpacity={0.3} />
                <Area type="monotone" dataKey="calls" stackId="1" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Revenue by Source">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByDay.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="coins" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gifts" fill="#00B894" radius={[4, 4, 0, 0]} />
                <Bar dataKey="calls" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {tab === "payments" && (
        <Card title="Recent Payments">
          <p className="text-sm text-muted-foreground">Payment records loaded via admin.getUserPaymentHistory</p>
        </Card>
      )}

      {tab === "withdrawals" && (
        <>
          <DataTable
            columns={[
              { key: "id", label: "ID", render: (r) => String(r.id).slice(0, 8) },
              { key: "userId", label: "Model" },
              { key: "amount", label: "Amount", render: (r) => formatCurrency(Number(r.amount ?? 0)) },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
              { key: "createdAt", label: "Requested", render: (r) => r.createdAt ? formatDate(String(r.createdAt)) : "-" },
              { key: "actions", label: "", render: (r) => (
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => setSelectedWithdrawal(r)}>Review</Button>
                </div>
              )},
            ]}
            data={wRows}
          />

          <Modal open={!!selectedWithdrawal} onClose={() => setSelectedWithdrawal(null)} title="Withdrawal Review">
            {selectedWithdrawal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Model ID:</span> {selectedWithdrawal.userId}</div>
                  <div><span className="text-muted-foreground">Amount:</span> {formatCurrency(Number(selectedWithdrawal.amount ?? 0))}</div>
                  <div><span className="text-muted-foreground">Method:</span> {selectedWithdrawal.method ?? "Bank Transfer"}</div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={String(selectedWithdrawal.status)} /></div>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button variant="primary" size="sm">Approve</Button>
                  <Button variant="danger" size="sm">Reject</Button>
                  <Button variant="secondary" size="sm">Hold for Investigation</Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </>
  );
}
