"use client";
import { trpc } from "@/lib/trpc";
import { PageHeader, Card, DataTable, StatusBadge } from "@/components/ui";

export default function CampaignsPage() {
  const campaigns = trpc.admin.listNotificationCampaigns.useQuery({ limit: 50 }, { retry: false });
  const rows = (campaigns.data?.items ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Campaign Management" description="Manage lifecycle campaigns and messaging schedules" />
      <Card title="Campaign Queue">
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "campaignType", label: "Type" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "draft")} /> },
            { key: "scheduledAt", label: "Scheduled At" },
            { key: "createdAt", label: "Created" },
          ]}
          data={rows}
        />
      </Card>
    </>
  );
}
