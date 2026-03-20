"use client";

import { trpc } from "@/lib/trpc";
import { Card, DataTable, KpiCard, PageHeader } from "@/components/ui";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { Building2, HandCoins, Users } from "lucide-react";

export default function AgencyDashboardPage() {
  const dashboard = trpc.agency.getAgencyDashboard.useQuery(undefined, { retry: false });
  const commission = trpc.agency.getCommissionSummary.useQuery(undefined, { retry: false });

  const agency = (dashboard.data as any)?.agency;
  const hosts = ((dashboard.data as any)?.hosts ?? []) as Record<string, unknown>[];
  const hostCount = Number((dashboard.data as any)?.hostCount ?? hosts.length ?? 0);

  const totals = commission.data as any;
  const totalCommissionUsd = Number(totals?.totalCommissionUsd ?? 0);
  const totalGrossRevenueUsd = Number(totals?.totalGrossRevenueUsd ?? 0);
  const recentCommissionItems = (totals?.items ?? []).slice(0, 10) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Agency Dashboard"
        description="Your agency overview, roster and earnings performance."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <KpiCard label="Agency" value={agency?.agencyName ?? "—"} icon={Building2} />
        <KpiCard label="Active Models" value={formatNumber(hostCount)} icon={Users} />
        <KpiCard label="Gross Revenue" value={formatCurrency(totalGrossRevenueUsd)} icon={HandCoins} />
        <KpiCard label="Commission Earned" value={formatCurrency(totalCommissionUsd)} icon={HandCoins} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Recent Roster">
          <DataTable
            columns={[
              { key: "displayName", label: "Model" },
              { key: "userId", label: "User ID", render: (row) => String(row.userId ?? "").slice(0, 8) },
              {
                key: "assignedAt",
                label: "Joined",
                render: (row) => row.assignedAt ? formatDate(String(row.assignedAt)) : "-",
              },
            ]}
            data={hosts}
          />
        </Card>

        <Card title="Recent Commission Records">
          <DataTable
            columns={[
              { key: "hostUserId", label: "Model", render: (row) => String(row.hostUserId ?? "").slice(0, 8) },
              { key: "grossRevenueUsd", label: "Gross", render: (row) => formatCurrency(Number(row.grossRevenueUsd ?? 0)) },
              { key: "commissionAmountUsd", label: "Commission", render: (row) => formatCurrency(Number(row.commissionAmountUsd ?? 0)) },
              { key: "createdAt", label: "Date", render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-" },
            ]}
            data={recentCommissionItems}
          />
        </Card>
      </div>
    </>
  );
}

