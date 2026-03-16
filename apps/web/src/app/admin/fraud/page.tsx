"use client";

import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { Button, Card, DataTable, KpiCard, PageHeader, StatusBadge } from "@/components/ui";
import { AlertTriangle, Eye, ShieldAlert, ScanSearch } from "lucide-react";

export default function FraudPage() {
  const dashboardQuery = trpc.fraud.getFraudDashboard.useQuery(undefined, { retry: false });
  const flagsQuery = trpc.admin.listFraudFlags.useQuery({ limit: 50 }, { retry: false });
  const scansQuery = trpc.admin.listMediaScanResults.useQuery({ limit: 25 }, { retry: false });
  const resolveFlag = trpc.admin.resolveFraudFlag.useMutation({
    onSuccess: () => {
      void dashboardQuery.refetch();
      void flagsQuery.refetch();
    },
  });

  const dashboard = (dashboardQuery.data ?? {
    pendingFlags: 0,
    recentSignals: [],
    highRiskUsers: [],
  }) as {
    pendingFlags: number;
    recentSignals: Record<string, unknown>[];
    highRiskUsers: Record<string, unknown>[];
  };
  const flags = (flagsQuery.data?.items ?? []) as Record<string, unknown>[];
  const scans = (scansQuery.data?.items ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Fraud Monitoring"
        description="Review risk signals, resolve flagged entities, and monitor automated media scans."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <KpiCard label="Pending Flags" value={dashboard.pendingFlags} icon={ShieldAlert} />
        <KpiCard label="Recent Signals" value={dashboard.recentSignals.length} icon={Eye} />
        <KpiCard label="High-Risk Entities" value={dashboard.highRiskUsers.length} icon={AlertTriangle} />
        <KpiCard label="Media Scans" value={scans.length} icon={ScanSearch} />
      </div>

      <Card title="Fraud Flags" className="mb-6">
        <DataTable
          columns={[
            { key: "entityType", label: "Entity" },
            { key: "entityId", label: "Entity ID" },
            { key: "riskScore", label: "Risk Score" },
            { key: "riskLevel", label: "Risk Level", render: (row) => <StatusBadge status={String(row.riskLevel ?? "OPEN")} /> },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "OPEN")} /> },
            {
              key: "createdAt",
              label: "Created",
              render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-",
            },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={String(row.status ?? "").toUpperCase() === "RESOLVED" || resolveFlag.isPending}
                    onClick={() => resolveFlag.mutate({ flagId: String(row.id), action: "reviewed_by_admin" })}
                  >
                    Resolve
                  </Button>
                </div>
              ),
            },
          ]}
          data={flags}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="High-Risk Entities">
          <DataTable
            columns={[
              { key: "entityId", label: "Entity ID" },
              {
                key: "avgScore",
                label: "Average Score",
                render: (row) => Number(row.avgScore ?? 0).toFixed(2),
              },
              { key: "signalCount", label: "Signal Count" },
            ]}
            data={dashboard.highRiskUsers}
          />
        </Card>

        <Card title="Media Scan Queue">
          <DataTable
            columns={[
              { key: "mediaAssetId", label: "Asset ID" },
              { key: "scannerName", label: "Scanner" },
              { key: "scanStatus", label: "Status", render: (row) => <StatusBadge status={String(row.scanStatus ?? "PENDING")} /> },
              {
                key: "riskLabelsJson",
                label: "Labels",
                render: (row) => {
                  const labels = row.riskLabelsJson;
                  if (!labels) return "-";
                  return (
                    <span className="text-xs text-muted-foreground">
                      {JSON.stringify(labels).slice(0, 60)}
                    </span>
                  );
                },
              },
              {
                key: "createdAt",
                label: "Created",
                render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-",
              },
            ]}
            data={scans}
          />
        </Card>
      </div>
    </>
  );
}
