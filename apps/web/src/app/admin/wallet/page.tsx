"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Coins, Gem, PiggyBank, Wallet2 } from "lucide-react";
import { trpc } from "../../../lib/trpc";
import { formatDate, formatNumber } from "../../../lib/utils";
import { AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard, AdminModal, AdminPageHeader, AdminPanelCard, AdminSearchField, AdminSelect, AdminStatusPill } from "../../../features/admin/components/admin-ui";
import { useAdminNotifier } from "../../../features/admin/hooks/use-admin-panel-api";

type UserRow = { id: string; displayName: string; email: string; status: string; role: string };

type UserDetail = {
  user?: { id: string; displayName: string; email: string } | null;
  wallet?: {
    coinBalance?: number;
    diamondBalance?: number;
    lifetimeCoinsPurchased?: number;
    lifetimeCoinsSpent?: number;
    lifetimeDiamondsEarned?: number;
    lifetimeDiamondsWithdrawn?: number;
  } | null;
};

type TransactionRow = {
  id: string;
  ledger: "COIN" | "DIAMOND";
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string | Date;
};

export default function AdminWalletPage() {
  const notify = useAdminNotifier();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<"ALL" | "COIN" | "DIAMOND">("ALL");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [coinDelta, setCoinDelta] = useState("0");
  const [diamondDelta, setDiamondDelta] = useState("0");
  const [description, setDescription] = useState("");
  const deferredSearch = useDeferredValue(search);

  const usersQuery = trpc.admin.listUsers.useQuery({ limit: 25, search: deferredSearch || undefined }, { retry: false });
  const userRows = (usersQuery.data?.items ?? []) as UserRow[];
  const userDetail = trpc.admin.getUserDetail.useQuery({ userId: selectedUserId ?? "00000000-0000-0000-0000-000000000000" }, { enabled: Boolean(selectedUserId), retry: false });
  const transactionsQuery = trpc.admin.listWalletTransactions.useQuery({ userId: selectedUserId ?? undefined, limit: 30, ledger: ledgerFilter }, { enabled: Boolean(selectedUserId), retry: false });
  const adjustWallet = trpc.admin.adjustUserWallet.useMutation({
    onSuccess: async () => {
      notify.success("Wallet adjusted");
      setAdjustOpen(false);
      setCoinDelta("0");
      setDiamondDelta("0");
      setDescription("");
      await Promise.all([userDetail.refetch(), transactionsQuery.refetch()]);
    },
    onError(error: unknown) {
      notify.error("Wallet adjustment failed", error instanceof Error ? error.message : "Unknown error");
    },
  });

  useEffect(() => {
    if (!selectedUserId && userRows[0]?.id) {
      setSelectedUserId(userRows[0].id);
    }
  }, [selectedUserId, userRows]);

  const detail = (userDetail.data ?? null) as UserDetail | null;
  const wallet = detail?.wallet;
  const transactionRows = (transactionsQuery.data?.items ?? []) as TransactionRow[];

  const metrics = useMemo(() => ({
    coins: Number(wallet?.coinBalance ?? 0),
    diamonds: Number(wallet?.diamondBalance ?? 0),
    purchased: Number(wallet?.lifetimeCoinsPurchased ?? 0),
    spent: Number(wallet?.lifetimeCoinsSpent ?? 0),
  }), [wallet]);

  async function applyAdjustment() {
    if (!selectedUserId) return;
    await adjustWallet.mutateAsync({
      userId: selectedUserId,
      coinDelta: Number(coinDelta || 0),
      diamondDelta: Number(diamondDelta || 0),
      description: description || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Balance Control"
        title="Wallet Control"
        description="Inspect user balances, review wallet ledger activity, and post manual admin adjustments."
        actions={<AdminButton onClick={() => setAdjustOpen(true)} disabled={!selectedUserId}>Adjust Wallet</AdminButton>}
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminPanelCard title="User Lookup" subtitle="Search and select the wallet you want to inspect.">
          <div className="space-y-4">
            <AdminSearchField value={search} onChange={setSearch} placeholder="Search users by name or email" />
            <div className="space-y-2">
              {userRows.map((user) => {
                const active = user.id === selectedUserId;
                return (
                  <button key={user.id} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`} onClick={() => setSelectedUserId(user.id)}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className={`text-xs ${active ? "text-white/75" : "text-slate-500"}`}>{user.email}</p>
                      </div>
                      <AdminStatusPill value={user.status} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </AdminPanelCard>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard label="Coin Balance" value={formatNumber(metrics.coins)} icon={Coins} />
            <AdminMetricCard label="Diamond Balance" value={formatNumber(metrics.diamonds)} icon={Gem} tone="sky" />
            <AdminMetricCard label="Lifetime Purchased" value={formatNumber(metrics.purchased)} icon={PiggyBank} tone="amber" />
            <AdminMetricCard label="Lifetime Spent" value={formatNumber(metrics.spent)} icon={Wallet2} tone="emerald" />
          </div>

          <AdminPanelCard title="Wallet Ledger" subtitle="Merged coin and diamond ledger for the selected user." actions={<div className="w-[180px]"><AdminSelect value={ledgerFilter} onChange={(event: any) => setLedgerFilter(event.currentTarget.value as "ALL" | "COIN" | "DIAMOND")}><option value="ALL">All ledgers</option><option value="COIN">Coin only</option><option value="DIAMOND">Diamond only</option></AdminSelect></div>}>
            <AdminDataTable<TransactionRow>
              rows={transactionRows}
              rowKey={(row: TransactionRow) => row.id}
              isLoading={transactionsQuery.isLoading}
              emptyMessage="No wallet activity for this user yet."
              columns={[
                { key: "ledger", label: "Ledger", render: (row: TransactionRow) => <AdminStatusPill value={row.ledger} /> },
                { key: "transactionType", label: "Type", render: (row: TransactionRow) => row.transactionType.replaceAll("_", " ") },
                { key: "amount", label: "Amount", sortable: true, render: (row: TransactionRow) => <span className={row.amount >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatNumber(row.amount)}</span> },
                { key: "balanceAfter", label: "Balance After", sortable: true, render: (row: TransactionRow) => formatNumber(row.balanceAfter) },
                { key: "description", label: "Description", render: (row: TransactionRow) => row.description ?? "-" },
                { key: "createdAt", label: "Created", sortable: true, render: (row: TransactionRow) => formatDate(row.createdAt) },
              ]}
            />
          </AdminPanelCard>
        </div>
      </div>

      <AdminModal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust Wallet" description="Post a manual ledger adjustment to the selected account.">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Coin delta" hint="Use negative values to debit the balance.">
            <AdminInput type="number" value={coinDelta} onChange={(event: any) => setCoinDelta(event.currentTarget.value)} />
          </AdminField>
          <AdminField label="Diamond delta" hint="Use negative values to debit the balance.">
            <AdminInput type="number" value={diamondDelta} onChange={(event: any) => setDiamondDelta(event.currentTarget.value)} />
          </AdminField>
          <div className="md:col-span-2">
            <AdminField label="Description">
              <AdminInput value={description} onChange={(event: any) => setDescription(event.currentTarget.value)} placeholder="Administrative adjustment reason" />
            </AdminField>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => setAdjustOpen(false)}>Cancel</AdminButton>
          <AdminButton onClick={applyAdjustment} disabled={adjustWallet.isPending || !selectedUserId}>{adjustWallet.isPending ? "Applying..." : "Apply adjustment"}</AdminButton>
        </div>
      </AdminModal>
    </div>
  );
}
