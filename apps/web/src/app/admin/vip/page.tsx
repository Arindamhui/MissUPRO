"use client";
import { trpc } from "@/lib/trpc";
import { PageHeader, Card, DataTable, StatusBadge } from "@/components/ui";

export default function VipManagementPage() {
  const subs = trpc.admin.listVipSubscriptions.useQuery({ limit: 50 }, { retry: false });
  const tiers = trpc.config.listVipTiers.useQuery(undefined, { retry: false });

  const subRows = (subs.data?.items ?? []) as Record<string, unknown>[];
  const tierRows = (tiers.data ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="VIP Management" description="Manage VIP tiers and active subscriptions" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="VIP Tiers">
          <DataTable
            columns={[
              { key: "tierCode", label: "Code" },
              { key: "displayName", label: "Name" },
              { key: "monthlyPriceUsd", label: "Monthly USD" },
              { key: "coinPrice", label: "Coin Price" },
              { key: "isActive", label: "Active", render: (r) => <StatusBadge status={r.isActive ? "active" : "inactive"} /> },
            ]}
            data={tierRows}
          />
        </Card>
        <Card title="Subscriptions">
          <DataTable
            columns={[
              { key: "userId", label: "User" },
              { key: "tier", label: "Tier" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
              { key: "currentPeriodStart", label: "Period Start" },
              { key: "currentPeriodEnd", label: "Period End" },
            ]}
            data={subRows}
          />
        </Card>
      </div>
    </>
  );
}
