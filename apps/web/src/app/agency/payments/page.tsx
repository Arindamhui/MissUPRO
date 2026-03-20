"use client";

import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, Input, Modal, PageHeader } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useMemo, useState } from "react";

type WithdrawalMethod = "PAYPAL" | "BANK_TRANSFER" | "PAYONEER" | "CRYPTO";

export default function AgencyPaymentsPage() {
  const balance = trpc.wallet.getBalance.useQuery(undefined, { retry: false });
  const commission = trpc.agency.getCommissionSummary.useQuery(undefined, { retry: false });

  const requestWithdrawal = trpc.wallet.requestWithdrawal.useMutation({
    onSuccess: () => void balance.refetch(),
  });

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amountDiamonds, setAmountDiamonds] = useState("100");
  const [method, setMethod] = useState<WithdrawalMethod>("BANK_TRANSFER");
  const [details, setDetails] = useState("");

  const commissionRows = useMemo(
    () => ((commission.data as any)?.items ?? []) as Record<string, unknown>[],
    [commission.data],
  );

  const totals = commission.data as any;
  const totalCommissionUsd = Number(totals?.totalCommissionUsd ?? 0);
  const totalGrossRevenueUsd = Number(totals?.totalGrossRevenueUsd ?? 0);

  const wallet = balance.data as any;
  const coinBalance = Number(wallet?.coinBalance ?? wallet?.coins ?? 0);
  const diamondBalance = Number(wallet?.diamondBalance ?? wallet?.diamonds ?? 0);

  const parseDetails = () => {
    const trimmed = details.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed) as Record<string, string>;
    } catch {
      return { note: trimmed };
    }
  };

  const submitWithdraw = () => {
    requestWithdrawal.mutate({
      amountDiamonds: Math.max(1, Number(amountDiamonds || 0)),
      payoutMethod: method,
      payoutDetails: parseDetails(),
    });
  };

  return (
    <>
      <PageHeader
        title="Payments"
        description="Track your agency earnings and request withdrawals."
        actions={(
          <Button onClick={() => setWithdrawOpen(true)}>Request Withdrawal</Button>
        )}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        <Card title="Wallet">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Coins</span>
              <span className="font-semibold">{coinBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Diamonds</span>
              <span className="font-semibold">{diamondBalance.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card title="Commission Summary">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Gross revenue</span>
              <span className="font-semibold">{formatCurrency(totalGrossRevenueUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Commission earned</span>
              <span className="font-semibold">{formatCurrency(totalCommissionUsd)}</span>
            </div>
          </div>
        </Card>

        <Card title="Payouts (Agency → Model)">
          <div className="text-sm text-gray-600">
            Model payout workflows can be enabled from the admin configuration engine. This panel currently tracks commission and supports withdrawals.
          </div>
        </Card>
      </div>

      <Card title="Commission Ledger">
        <DataTable
          columns={[
            { key: "hostUserId", label: "Model", render: (row) => String(row.hostUserId ?? "").slice(0, 12) },
            { key: "grossRevenueUsd", label: "Gross", render: (row) => formatCurrency(Number(row.grossRevenueUsd ?? 0)) },
            { key: "commissionAmountUsd", label: "Commission", render: (row) => formatCurrency(Number(row.commissionAmountUsd ?? 0)) },
            { key: "status", label: "Status", render: (row) => String(row.status ?? "") },
            { key: "createdAt", label: "Date", render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-" },
          ]}
          data={commissionRows}
        />
      </Card>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Request withdrawal">
        <div className="space-y-4">
          <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
            Withdrawals are requested in <span className="font-semibold">Diamonds</span>. Admins can review and approve withdrawals from the admin panel.
          </div>

          <Input
            label="Amount (diamonds)"
            value={amountDiamonds}
            onChange={(e) => setAmountDiamonds(e.target.value)}
            type="number"
            min={1}
          />

          <div>
            <label className="block text-sm font-medium mb-1">Payout method</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              value={method}
              onChange={(e) => setMethod(e.target.value as WithdrawalMethod)}
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="PAYPAL">PayPal</option>
              <option value="PAYONEER">Payoneer</option>
              <option value="CRYPTO">Crypto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payout details</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder='JSON preferred. Example: {"accountNumber":"...","ifsc":"...","name":"..."}'
            />
          </div>

          {requestWithdrawal.error ? (
            <div className="text-sm text-danger">{String(requestWithdrawal.error.message ?? requestWithdrawal.error)}</div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button disabled={requestWithdrawal.isPending} onClick={submitWithdraw}>
              {requestWithdrawal.isPending ? "Submitting..." : "Submit request"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

