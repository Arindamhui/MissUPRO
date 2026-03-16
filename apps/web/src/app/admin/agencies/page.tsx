"use client";

import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button, Card, DataTable, KpiCard, PageHeader, StatusBadge } from "@/components/ui";
import { Building2, FileCheck, HandCoins, Users } from "lucide-react";

export default function AgenciesPage() {
  const agenciesQuery = trpc.admin.listAgencies.useQuery({ limit: 25 }, { retry: false });
  const applicationsQuery = trpc.admin.listAgencyApplications.useQuery({ limit: 25 }, { retry: false });
  const commissionsQuery = trpc.admin.listAgencyCommissionRecords.useQuery({ limit: 25 }, { retry: false });

  const approveApplication = trpc.admin.approveAgencyApplication.useMutation({
    onSuccess: () => {
      void agenciesQuery.refetch();
      void applicationsQuery.refetch();
    },
  });
  const rejectApplication = trpc.admin.rejectAgencyApplication.useMutation({
    onSuccess: () => {
      void applicationsQuery.refetch();
    },
  });

  const agencies = (agenciesQuery.data?.items ?? []) as Record<string, unknown>[];
  const applications = (applicationsQuery.data?.items ?? []) as Record<string, unknown>[];
  const commissions = (commissionsQuery.data?.items ?? []) as Record<string, unknown>[];

  const totalCommission = commissions.reduce(
    (sum, row) => sum + Number(row.commissionAmountUsd ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Agency Management"
        description="Approve agency applications, monitor agency rosters, and review commission settlements."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <KpiCard label="Agencies" value={agencies.length} icon={Building2} />
        <KpiCard label="Pending Applications" value={applications.filter((row) => String(row.status) === "PENDING").length} icon={FileCheck} />
        <KpiCard label="Commission Records" value={commissions.length} icon={HandCoins} />
        <KpiCard label="Commission Value" value={formatCurrency(totalCommission)} icon={Users} />
      </div>

      <Card title="Agency Applications" className="mb-6">
        <DataTable
          columns={[
            { key: "agencyName", label: "Agency" },
            { key: "contactName", label: "Contact" },
            { key: "contactEmail", label: "Email" },
            { key: "country", label: "Country" },
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
                    disabled={String(row.status ?? "").toUpperCase() !== "PENDING" || approveApplication.isPending}
                    onClick={() => approveApplication.mutate({ applicationId: String(row.id) })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={String(row.status ?? "").toUpperCase() !== "PENDING" || rejectApplication.isPending}
                    onClick={() => rejectApplication.mutate({ applicationId: String(row.id), notes: "Rejected by admin review." })}
                  >
                    Reject
                  </Button>
                </div>
              ),
            },
          ]}
          data={applications}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Active Agencies">
          <DataTable
            columns={[
              { key: "agencyName", label: "Agency" },
              { key: "contactName", label: "Contact" },
              { key: "contactEmail", label: "Email" },
              { key: "country", label: "Country" },
              { key: "commissionTier", label: "Tier" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "PENDING")} /> },
            ]}
            data={agencies}
          />
        </Card>

        <Card title="Commission Ledger">
          <DataTable
            columns={[
              { key: "agencyId", label: "Agency ID" },
              { key: "hostUserId", label: "Host" },
              {
                key: "commissionAmountUsd",
                label: "Commission",
                render: (row) => formatCurrency(Number(row.commissionAmountUsd ?? 0)),
              },
              {
                key: "grossRevenueUsd",
                label: "Gross Revenue",
                render: (row) => formatCurrency(Number(row.grossRevenueUsd ?? 0)),
              },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "PENDING")} /> },
              {
                key: "periodStart",
                label: "Period Start",
                render: (row) => row.periodStart ? formatDate(String(row.periodStart)) : "-",
              },
            ]}
            data={commissions}
          />
        </Card>
      </div>
    </>
  );
}
