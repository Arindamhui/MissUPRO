"use client";
import { trpc } from "@/lib/trpc";
import { PageHeader, Card, DataTable, StatusBadge } from "@/components/ui";

export default function LeaderboardsPage() {
  const configs = trpc.config.listLeaderboardConfigs.useQuery(undefined, { retry: false });
  const rows = (configs.data ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Leaderboards" description="Configure ranking windows, metrics, and refresh policies" />
      <Card title="Leaderboard Configs">
        <DataTable
          columns={[
            { key: "configKey", label: "Config Key" },
            { key: "leaderboardType", label: "Type" },
            { key: "scoringMetric", label: "Metric" },
            { key: "maxEntries", label: "Max Entries" },
            { key: "refreshIntervalSeconds", label: "Refresh (s)" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "active")} /> },
          ]}
          data={rows}
        />
      </Card>
    </>
  );
}
