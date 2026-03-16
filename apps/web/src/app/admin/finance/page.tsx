"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, KpiCard, Tabs, Modal } from "@/components/ui";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { DollarSign, CreditCard, TrendingUp, ArrowDownToLine } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function FinancePage() {
  const [tab, setTab] = useState("overview");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | undefined>(undefined);

  const overview = trpc.admin.getFinancialOverview.useQuery(undefined, { retry: false });
  const withdrawals = trpc.admin.listWithdrawRequests.useQuery({ status: tab === "withdrawals" ? "PENDING" : undefined, limit: 20 }, { retry: false });
  const payments = trpc.admin.listPayments.useQuery({ limit: 30, status: paymentStatusFilter }, { retry: false, enabled: tab === "payments" });
  const paymentDisputes = trpc.admin.listPaymentDisputes.useQuery({ limit: 20 }, { retry: false, enabled: tab === "payments" });
  const ledgerMismatches = trpc.admin.listLedgerMismatches.useQuery({ limit: 50 }, { retry: false, enabled: tab === "reconciliation" });
  const paymentRecon = trpc.admin.runPaymentReconciliation.useQuery({ limit: 500 }, { retry: false, enabled: tab === "reconciliation" });
  const webhookEvents = trpc.admin.listWebhookEvents.useQuery({ limit: 20 }, { retry: false, enabled: tab === "reconciliation" });
  const revenueQuery = trpc.analytics.getRevenueAnalytics.useQuery(
    { startDate: new Date(Date.now() - 30 * 86400000), endDate: new Date() },
    { retry: false },
  );
  const processMut = trpc.admin.processWithdrawRequest.useMutation({
    onSuccess: () => { withdrawals.refetch(); setSelectedWithdrawal(null); },
  });
  const refundMut = trpc.admin.createRefund.useMutation({ onSuccess: () => payments.refetch() });
  const updateStatusMut = trpc.admin.updatePaymentStatus.useMutation({ onSuccess: () => payments.refetch() });

  const ov = overview.data ?? { totalRevenue: 0, monthRevenue: 0, weekRevenue: 0, todayRevenue: 0, pendingPayouts: 0, payoutCount: 0 };
  const wRows = (withdrawals.data?.items ?? []) as Record<string, unknown>[];
  const paymentRows = (payments.data?.items ?? []) as Record<string, unknown>[];
  const revenueByDay = (revenueQuery.data as any)?.dailyRevenue ?? [];

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
          { id: "reconciliation", label: "Reconciliation" },
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
        <div className="space-y-6">
          <Card title="Payment History">
            <div className="space-y-4">
              <div className="flex gap-2">
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={paymentStatusFilter ?? "all"}
                  onChange={(e) => setPaymentStatusFilter(e.target.value === "all" ? undefined : e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="DISPUTED">Disputed</option>
                </select>
              </div>
              <DataTable
                columns={[
                  { key: "id", label: "ID", render: (r) => String(r.id).slice(0, 8) },
                  { key: "userId", label: "User ID", render: (r) => String(r.userId).slice(0, 8) },
                  { key: "amountUsd", label: "Amount", render: (r) => formatCurrency(Number(r.amountUsd ?? 0)) },
                  { key: "coinsCredited", label: "Coins" },
                  { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
                  { key: "createdAt", label: "Created", render: (r) => formatDate(String(r.createdAt)) },
                  {
                    key: "actions",
                    label: "",
                    render: (r) =>
                      r.status === "COMPLETED" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => refundMut.mutate({ paymentId: r.id })} disabled={refundMut.isPending}>Refund</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateStatusMut.mutate({ paymentId: r.id, status: "DISPUTED" })} disabled={updateStatusMut.isPending}>Mark Disputed</Button>
                        </div>
                      ) : null,
                  },
                ]}
                data={paymentRows}
              />
            </div>
          </Card>
          <Card title="Open Disputes">
            <DataTable
              columns={[
                { key: "providerDisputeId", label: "Provider Ref" },
                { key: "paymentId", label: "Payment", render: (r) => String(r.paymentId).slice(0, 8) },
                { key: "disputeReason", label: "Reason" },
                { key: "amountUsd", label: "Amount", render: (r) => formatCurrency(Number(r.amountUsd ?? 0)) },
                { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
              ]}
              data={paymentDisputes.data?.items ?? []}
            />
          </Card>
        </div>
      )}

      {tab === "withdrawals" && (
        <>
          <DataTable
            columns={[
              { key: "id", label: "ID", render: (r) => String(r.id).slice(0, 8) },
              { key: "modelUserId", label: "Model", render: (r) => String(r.modelUserId ?? r.userId ?? "").slice(0, 8) },
              { key: "totalPayoutAmount", label: "Amount", render: (r) => formatCurrency(Number(r.totalPayoutAmount ?? r.amount ?? 0)) },
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
                  <div><span className="text-muted-foreground">Model ID:</span> {selectedWithdrawal.modelUserId ?? selectedWithdrawal.userId}</div>
                  <div><span className="text-muted-foreground">Amount:</span> {formatCurrency(Number(selectedWithdrawal.totalPayoutAmount ?? selectedWithdrawal.amount ?? 0))}</div>
                  <div><span className="text-muted-foreground">Method:</span> {selectedWithdrawal.method ?? "Bank Transfer"}</div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={String(selectedWithdrawal.status)} /></div>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button variant="primary" size="sm" onClick={() => processMut.mutate({ requestId: String(selectedWithdrawal.id), action: "approve" })}>Approve</Button>
                  <Button variant="danger" size="sm" onClick={() => processMut.mutate({ requestId: String(selectedWithdrawal.id), action: "reject", reason: "Rejected by admin" })}>Reject</Button>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedWithdrawal(null)}>Hold for Investigation</Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {tab === "reconciliation" && (
        <div className="space-y-6">
          <Card title="Wallet ledger mismatches">
            <p className="text-sm text-muted-foreground mb-3">Wallets where coin balance does not match sum of coin_transactions.</p>
            <DataTable
              columns={[
                { key: "userId", label: "User ID", render: (r) => String(r.userId).slice(0, 8) },
                { key: "currentBalance", label: "Wallet balance" },
                { key: "ledgerBalance", label: "Ledger sum" },
              ]}
              data={ledgerMismatches.data?.items ?? []}
            />
          </Card>
          <Card title="Payment reconciliation">
            <p className="text-sm text-muted-foreground mb-3">Completed payments missing a PURCHASE coin transaction.</p>
            <div className="text-sm">
              Checked: {paymentRecon.data?.checked ?? 0} | Missing credits: {paymentRecon.data?.missingPaymentIds?.length ?? 0}
              {((paymentRecon.data?.missingPaymentIds ?? []).length as number) > 0 && (
                <ul className="mt-2 list-disc pl-4">
                  {(paymentRecon.data?.missingPaymentIds ?? []).slice(0, 20).map((id: string) => (
                    <li key={id}>{id}</li>
                  ))}
                  {(paymentRecon.data?.missingPaymentIds ?? []).length > 20 && <li>… and more</li>}
                </ul>
              )}
            </div>
          </Card>
          <Card title="Recent webhook events">
            <DataTable
              columns={[
                { key: "provider", label: "Provider" },
                { key: "providerEventId", label: "Event ID" },
                { key: "processingStatus", label: "Status", render: (r) => <StatusBadge status={String(r.processingStatus ?? "PENDING")} /> },
                { key: "receivedAt", label: "Received", render: (r) => formatDate(String(r.receivedAt)) },
              ]}
              data={webhookEvents.data?.items ?? []}
            />
          </Card>
        </div>
      )}
    </>
  );
}
