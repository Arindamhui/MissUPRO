"use client";

import { useDeferredValue, useState } from "react";
import { CreditCard, Gem, Receipt, Wallet } from "lucide-react";
import { trpc } from "../../../lib/trpc";
import { formatCurrency, formatDate, formatNumber } from "../../../lib/utils";
import { AdminDataTable, AdminMetricCard, AdminPageHeader, AdminPanelCard, AdminSearchField, AdminSelect, AdminStatusPill, AdminTabs } from "../../../features/admin/components/admin-ui";

type LedgerRow = Record<string, unknown>;
type PaymentRow = Record<string, unknown>;
type WithdrawalRow = Record<string, unknown>;

export default function AdminTransactionsPage() {
  const [tab, setTab] = useState<"ledger" | "payments" | "withdrawals">("ledger");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [ledgerFilter, setLedgerFilter] = useState<"ALL" | "COIN" | "DIAMOND">("ALL");
  const deferredUserSearch = useDeferredValue(userSearch);

  const userQuery = trpc.admin.listUsers.useQuery({ limit: 20, search: deferredUserSearch || undefined }, { retry: false });
  const ledgerQuery = trpc.admin.listWalletTransactions.useQuery({ userId: selectedUserId, limit: 40, ledger: ledgerFilter }, { retry: false, enabled: tab === "ledger" });
  const paymentsQuery = trpc.admin.listPayments.useQuery({ limit: 30, userId: selectedUserId }, { retry: false, enabled: tab === "payments" });
  const withdrawalsQuery = trpc.admin.listWithdrawRequests.useQuery({ limit: 30 }, { retry: false, enabled: tab === "withdrawals" });
  const financialOverview = trpc.admin.getFinancialOverview.useQuery(undefined, { retry: false });

  const users = (userQuery.data?.items ?? []) as Array<{ id: string; displayName: string; email: string }>;
  const ledgerRows = (ledgerQuery.data?.items ?? []) as LedgerRow[];
  const paymentRows = (paymentsQuery.data?.items ?? []) as PaymentRow[];
  const withdrawalRows = (withdrawalsQuery.data?.items ?? []) as WithdrawalRow[];
  const overview = financialOverview.data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Finance Ops"
        title="Transactions"
        description="Track wallet ledger events, payment records, and withdrawal operations from one control surface."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Revenue" value={formatCurrency(overview?.totalRevenue ?? 0)} icon={Receipt} />
        <AdminMetricCard label="Today Revenue" value={formatCurrency(overview?.todayRevenue ?? 0)} icon={CreditCard} tone="emerald" />
        <AdminMetricCard label="Gift Revenue" value={formatNumber(overview?.giftRevenue ?? 0)} icon={Gem} tone="amber" />
        <AdminMetricCard label="Pending Withdrawals" value={formatCurrency(overview?.pendingWithdrawals?.amount ?? 0)} icon={Wallet} tone="sky" />
      </div>

      <AdminPanelCard title="Transaction Explorer" subtitle="Filter by ledger and optionally scope the view to a single user.">
        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,320px)_220px]">
          <AdminSearchField value={userSearch} onChange={setUserSearch} placeholder="Search user for scoped transactions" />
          <AdminSelect value={ledgerFilter} onChange={(event: any) => setLedgerFilter(event.currentTarget.value as "ALL" | "COIN" | "DIAMOND") }>
            <option value="ALL">All ledgers</option>
            <option value="COIN">Coin ledger</option>
            <option value="DIAMOND">Diamond ledger</option>
          </AdminSelect>
        </div>

        {users.length > 0 ? (
          <div className="mb-5 flex flex-wrap gap-2">
            <button className={`rounded-full px-4 py-2 text-sm transition ${!selectedUserId ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setSelectedUserId(undefined)}>All Users</button>
            {users.map((user) => (
              <button key={user.id} className={`rounded-full px-4 py-2 text-sm transition ${selectedUserId === user.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`} onClick={() => setSelectedUserId(user.id)}>
                {user.displayName}
              </button>
            ))}
          </div>
        ) : null}

        <AdminTabs value={tab} onChange={(value: string) => setTab(value as typeof tab)} tabs={[{ value: "ledger", label: "Wallet Ledger" }, { value: "payments", label: "Payments" }, { value: "withdrawals", label: "Withdrawals" }]} />

        {tab === "ledger" ? (
          <AdminDataTable<LedgerRow>
            rows={ledgerRows}
            rowKey={(row: LedgerRow) => String(row.id)}
            isLoading={ledgerQuery.isLoading}
            emptyMessage="No wallet transactions found."
            columns={[
              { key: "displayName", label: "User", render: (row: LedgerRow) => String(row.displayName ?? row.email ?? row.userId ?? "-") },
              { key: "ledger", label: "Ledger", render: (row: LedgerRow) => <AdminStatusPill value={String(row.ledger)} /> },
              { key: "transactionType", label: "Type", render: (row: LedgerRow) => String(row.transactionType ?? "").replaceAll("_", " ") },
              { key: "amount", label: "Amount", sortable: true, render: (row: LedgerRow) => <span className={Number(row.amount ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatNumber(Number(row.amount ?? 0))}</span> },
              { key: "balanceAfter", label: "Balance After", sortable: true, render: (row: LedgerRow) => formatNumber(Number(row.balanceAfter ?? 0)) },
              { key: "createdAt", label: "Created", sortable: true, render: (row: LedgerRow) => formatDate(String(row.createdAt ?? "")) },
            ]}
          />
        ) : null}

        {tab === "payments" ? (
          <AdminDataTable<PaymentRow>
            rows={paymentRows}
            rowKey={(row: PaymentRow) => String(row.id)}
            isLoading={paymentsQuery.isLoading}
            emptyMessage="No payments found."
            columns={[
              { key: "userId", label: "User", render: (row: PaymentRow) => <span className="font-mono text-xs text-slate-600">{String(row.userId ?? "-")}</span> },
              { key: "provider", label: "Provider", render: (row: PaymentRow) => String(row.provider ?? row.paymentProvider ?? "-") },
              { key: "amountUsd", label: "Amount", sortable: true, render: (row: PaymentRow) => formatCurrency(Number(row.amountUsd ?? 0)) },
              { key: "status", label: "Status", render: (row: PaymentRow) => <AdminStatusPill value={String(row.status ?? "PENDING")} /> },
              { key: "createdAt", label: "Created", sortable: true, render: (row: PaymentRow) => formatDate(String(row.createdAt ?? "")) },
            ]}
          />
        ) : null}

        {tab === "withdrawals" ? (
          <AdminDataTable<WithdrawalRow>
            rows={withdrawalRows}
            rowKey={(row: WithdrawalRow) => String(row.id)}
            isLoading={withdrawalsQuery.isLoading}
            emptyMessage="No withdrawals found."
            columns={[
              { key: "modelUserId", label: "User", render: (row: WithdrawalRow) => <span className="font-mono text-xs text-slate-600">{String(row.modelUserId ?? row.userId ?? "-")}</span> },
              { key: "totalPayoutAmount", label: "Payout", sortable: true, render: (row: WithdrawalRow) => formatCurrency(Number(row.totalPayoutAmount ?? 0)) },
              { key: "status", label: "Status", render: (row: WithdrawalRow) => <AdminStatusPill value={String(row.status ?? "PENDING")} /> },
              { key: "createdAt", label: "Created", sortable: true, render: (row: WithdrawalRow) => formatDate(String(row.createdAt ?? "")) },
            ]}
          />
        ) : null}
      </AdminPanelCard>
    </div>
  );
}
