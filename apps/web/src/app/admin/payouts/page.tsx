"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { Button, Card, DataTable, Input, KpiCard, Modal, PageHeader, StatusBadge } from "@/components/ui";
import { CreditCard, HandCoins, Hourglass, Wallet } from "lucide-react";

type WithdrawRow = Record<string, unknown>;

export default function PayoutsPage() {
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const endDate = new Date();
  const startDate = new Date(Date.now() - 30 * 86400000);

  const overviewQuery = trpc.admin.getFinancialOverview.useQuery({ startDate, endDate }, { retry: false });
  const requestsQuery = trpc.admin.listWithdrawRequests.useQuery({ limit: 50 }, { retry: false });

  const processRequest = trpc.admin.processWithdrawRequest.useMutation({
    onSuccess: async () => {
      setSelectedRequest(null);
      setRejectionReason("");
      await overviewQuery.refetch();
      await requestsQuery.refetch();
    },
  });

  const requests = (requestsQuery.data?.items ?? []) as WithdrawRow[];
  const pendingRequests = requests.filter((row) => String(row.status ?? "").toUpperCase() === "PENDING");
  const financialOverview = overviewQuery.data ?? {
    pendingWithdrawals: { amount: 0, count: 0 },
    totalWithdrawals: 0,
    totalRevenue: 0,
    giftRevenue: 0,
  };

  const totalPendingMinutes = pendingRequests.reduce(
    (sum, row) => sum + Number(row.audioMinutesSnapshot ?? 0) + Number(row.videoMinutesSnapshot ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Withdrawal Approval"
        description="Review pending payout requests, approve them through the admin ledger, or reject them with an audit reason."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="Pending Requests" value={formatNumber(Number(financialOverview.pendingWithdrawals?.count ?? 0))} icon={Hourglass} />
        <KpiCard label="Pending Amount" value={formatCurrency(Number(financialOverview.pendingWithdrawals?.amount ?? 0))} icon={Wallet} />
        <KpiCard label="Total Withdrawn" value={formatCurrency(Number(financialOverview.totalWithdrawals ?? 0))} icon={HandCoins} />
        <KpiCard label="Gross Revenue" value={formatCurrency(Number(financialOverview.totalRevenue ?? 0))} icon={CreditCard} />
      </div>

      <Card title="Withdrawal Queue">
        <DataTable
          columns={[
            { key: "modelUserId", label: "Model", render: (row) => String(row.modelUserId ?? row.userId ?? "-").slice(0, 8) },
            { key: "audioMinutesSnapshot", label: "Audio Min", render: (row) => formatNumber(Number(row.audioMinutesSnapshot ?? 0)) },
            { key: "videoMinutesSnapshot", label: "Video Min", render: (row) => formatNumber(Number(row.videoMinutesSnapshot ?? 0)) },
            {
              key: "totalPayoutAmount",
              label: "Requested",
              render: (row) => formatCurrency(Number(row.totalPayoutAmount ?? 0), String(row.currency ?? "USD")),
            },
            { key: "payoutMethod", label: "Method", render: (row) => String(row.payoutMethod ?? "-") },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "PENDING")} /> },
            {
              key: "createdAt",
              label: "Submitted",
              render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-",
            },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={String(row.status ?? "").toUpperCase() !== "PENDING" || processRequest.isPending}
                    onClick={() => processRequest.mutate({ requestId: String(row.id), action: "approve" })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={String(row.status ?? "").toUpperCase() !== "PENDING"}
                    onClick={() => setSelectedRequest(row)}
                  >
                    Review
                  </Button>
                </div>
              ),
            },
          ]}
          data={requests}
        />

        <div className="mt-4 text-sm text-muted-foreground">
          Pending minutes in queue: {formatNumber(totalPendingMinutes)}
        </div>
      </Card>

      <Modal open={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Review Withdrawal Request">
        {selectedRequest ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <p><span className="text-muted-foreground">Request ID:</span> {String(selectedRequest.id)}</p>
              <p><span className="text-muted-foreground">Model:</span> {String(selectedRequest.modelUserId ?? selectedRequest.userId ?? "-")}</p>
              <p><span className="text-muted-foreground">Requested:</span> {formatCurrency(Number(selectedRequest.totalPayoutAmount ?? 0), String(selectedRequest.currency ?? "USD"))}</p>
              <p><span className="text-muted-foreground">Method:</span> {String(selectedRequest.payoutMethod ?? "-")}</p>
              <p><span className="text-muted-foreground">Audio Minutes:</span> {formatNumber(Number(selectedRequest.audioMinutesSnapshot ?? 0))}</p>
              <p><span className="text-muted-foreground">Video Minutes:</span> {formatNumber(Number(selectedRequest.videoMinutesSnapshot ?? 0))}</p>
            </div>

            <Input
              label="Rejection reason"
              placeholder="Required when rejecting this withdrawal"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
            />

            <div className="flex gap-2">
              <Button
                disabled={processRequest.isPending}
                onClick={() => processRequest.mutate({ requestId: String(selectedRequest.id), action: "approve" })}
              >
                Approve Request
              </Button>
              <Button
                variant="danger"
                disabled={processRequest.isPending || !rejectionReason.trim()}
                onClick={() => processRequest.mutate({
                  requestId: String(selectedRequest.id),
                  action: "reject",
                  reason: rejectionReason.trim(),
                })}
              >
                Reject Request
              </Button>
              <Button variant="secondary" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
