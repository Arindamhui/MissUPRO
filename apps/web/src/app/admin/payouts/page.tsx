"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button, Card, DataTable, Input, KpiCard, Modal, PageHeader, StatusBadge } from "@/components/ui";
import { CreditCard, HandCoins, Hourglass, Wallet } from "lucide-react";

type WithdrawRow = Record<string, unknown>;

export default function PayoutsPage() {
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRow | null>(null);
  const [audioRateUsd, setAudioRateUsd] = useState("");
  const [videoRateUsd, setVideoRateUsd] = useState("");

  const requestsQuery = trpc.payouts.listWithdrawRequests.useQuery({ limit: 50 }, { retry: false });
  const approvePayout = trpc.payouts.approveMinutePayout.useMutation({
    onSuccess: () => {
      setSelectedRequest(null);
      void requestsQuery.refetch();
    },
  });
  const rejectRequest = trpc.admin.processWithdrawRequest.useMutation({
    onSuccess: () => {
      void requestsQuery.refetch();
    },
  });

  const requests = (requestsQuery.data?.items ?? []) as WithdrawRow[];
  const pendingRequests = requests.filter((row) => String(row.status ?? "").toUpperCase() === "PENDING");
  const totalPending = pendingRequests.reduce((sum, row) => sum + Number(row.totalPayoutAmount ?? 0), 0);
  const totalMinutes = pendingRequests.reduce(
    (sum, row) => sum + Number(row.audioMinutesSnapshot ?? 0) + Number(row.videoMinutesSnapshot ?? 0),
    0,
  );

  const previewTotal = useMemo(() => {
    if (!selectedRequest) return 0;
    const audioMinutes = Number(selectedRequest.audioMinutesSnapshot ?? 0);
    const videoMinutes = Number(selectedRequest.videoMinutesSnapshot ?? 0);
    return audioMinutes * Number(audioRateUsd || 0) + videoMinutes * Number(videoRateUsd || 0);
  }, [audioRateUsd, selectedRequest, videoRateUsd]);

  const openApproveModal = (row: WithdrawRow) => {
    setSelectedRequest(row);
    setAudioRateUsd(String(row.audioRateSnapshot ?? "0"));
    setVideoRateUsd(String(row.videoRateSnapshot ?? "0"));
  };

  return (
    <>
      <PageHeader
        title="Payout Control"
        description="Review model withdrawal requests, confirm payout rates, and close the immutable payout ledger."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <KpiCard label="Pending Requests" value={pendingRequests.length} icon={Hourglass} />
        <KpiCard label="Pending Amount" value={formatCurrency(totalPending)} icon={Wallet} />
        <KpiCard label="Pending Minutes" value={totalMinutes} icon={HandCoins} />
        <KpiCard label="Total Requests" value={requests.length} icon={CreditCard} />
      </div>

      <Card title="Withdrawal Queue">
        <DataTable
          columns={[
            { key: "modelUserId", label: "Model" },
            { key: "audioMinutesSnapshot", label: "Audio Min" },
            { key: "videoMinutesSnapshot", label: "Video Min" },
            {
              key: "totalPayoutAmount",
              label: "Requested",
              render: (row) => formatCurrency(Number(row.totalPayoutAmount ?? 0), String(row.currency ?? "USD")),
            },
            { key: "payoutMethod", label: "Method" },
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
                    disabled={String(row.status ?? "").toUpperCase() !== "PENDING"}
                    onClick={() => openApproveModal(row)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={String(row.status ?? "").toUpperCase() !== "PENDING" || rejectRequest.isPending}
                    onClick={() => rejectRequest.mutate({
                      requestId: String(row.id),
                      action: "reject",
                      reason: "Rejected during payout review.",
                    })}
                  >
                    Reject
                  </Button>
                </div>
              ),
            },
          ]}
          data={requests}
        />
      </Card>

      <Modal
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Approve Minute-Based Payout"
      >
        <div className="space-y-4">
          <Input
            label="Audio Rate (USD/min)"
            type="number"
            step="0.0001"
            value={audioRateUsd}
            onChange={(event) => setAudioRateUsd(event.target.value)}
          />
          <Input
            label="Video Rate (USD/min)"
            type="number"
            step="0.0001"
            value={videoRateUsd}
            onChange={(event) => setVideoRateUsd(event.target.value)}
          />

          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <p className="font-medium">Payout Preview</p>
            <p className="text-muted-foreground mt-1">
              Estimated payout: {formatCurrency(previewTotal)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              disabled={!selectedRequest || approvePayout.isPending}
              onClick={() => {
                if (!selectedRequest) return;
                approvePayout.mutate({
                  withdrawRequestId: String(selectedRequest.id),
                  audioRateUsd: Number(audioRateUsd),
                  videoRateUsd: Number(videoRateUsd),
                });
              }}
            >
              Confirm Payout
            </Button>
            <Button variant="secondary" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
