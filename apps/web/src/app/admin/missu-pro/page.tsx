"use client";

import { useMemo } from "react";
import { BadgeCheck, Building2, ClipboardCheck, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, KpiCard, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

export default function MissuProAdminPage() {
  const overview = trpc.missu.getAdminOverview.useQuery(undefined, { retry: false });
  const hosts = trpc.missu.listHosts.useQuery({ limit: 12 }, { retry: false });
  const reviewHost = trpc.missu.reviewHostApplication.useMutation({
    onSuccess: () => {
      void overview.refetch();
      void hosts.refetch();
    },
  });
  const reviewAgency = trpc.missu.reviewAgency.useMutation({
    onSuccess: () => {
      void overview.refetch();
    },
  });

  const kpis = overview.data?.kpis ?? {
    totalUsers: 0,
    totalHosts: 0,
    totalAgencies: 0,
    pendingHostApplications: 0,
    pendingAgencyApprovals: 0,
  };

  const hostApplications = useMemo(
    () => (overview.data?.recentHostApplications ?? []) as Record<string, unknown>[],
    [overview.data?.recentHostApplications],
  );
  const agencies = useMemo(
    () => (overview.data?.recentAgencies ?? []) as Record<string, unknown>[],
    [overview.data?.recentAgencies],
  );
  const hostRows = useMemo(() => (hosts.data ?? []) as Record<string, unknown>[], [hosts.data]);

  return (
    <>
      <PageHeader
        title="MissU Pro Operations"
        description="Approve hosts, activate agencies, and monitor the new MissU ID-based growth funnel."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Users" value={formatNumber(kpis.totalUsers)} icon={Users} />
        <KpiCard label="Approved Hosts" value={formatNumber(kpis.totalHosts)} icon={BadgeCheck} />
        <KpiCard label="Approved Agencies" value={formatNumber(kpis.totalAgencies)} icon={Building2} />
        <KpiCard label="Pending Hosts" value={formatNumber(kpis.pendingHostApplications)} icon={ClipboardCheck} />
        <KpiCard label="Pending Agencies" value={formatNumber(kpis.pendingAgencyApprovals)} icon={ClipboardCheck} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Host Approval Queue">
          <DataTable
            columns={[
              { key: "publicUserId", label: "User ID", render: (row) => String(row.publicUserId ?? "-") },
              { key: "displayName", label: "Applicant" },
              { key: "applicationType", label: "Route", render: (row) => <StatusBadge status={String(row.applicationType ?? "PENDING")} /> },
              { key: "agencyCode", label: "Agency", render: (row) => String(row.agencyCode ?? row.agencyCodeSnapshot ?? "Platform") },
              { key: "submittedAt", label: "Submitted", render: (row) => row.submittedAt ? formatDate(String(row.submittedAt)) : "-" },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={reviewHost.isPending || String(row.status ?? "") !== "PENDING"}
                      onClick={() => reviewHost.mutate({ applicationId: String(row.id), action: "approve" })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={reviewHost.isPending || String(row.status ?? "") !== "PENDING"}
                      onClick={() => reviewHost.mutate({ applicationId: String(row.id), action: "reject", reason: "Verification details need revision" })}
                    >
                      Reject
                    </Button>
                  </div>
                ),
              },
            ]}
            data={hostApplications}
          />
        </Card>

        <Card title="Agency Approval Queue">
          <DataTable
            columns={[
              { key: "agencyCode", label: "Agency ID", render: (row) => String(row.agencyCode ?? "-") },
              { key: "agencyName", label: "Agency" },
              { key: "contactName", label: "Contact" },
              { key: "country", label: "Country" },
              { key: "approvalStatus", label: "Status", render: (row) => <StatusBadge status={String(row.approvalStatus ?? row.status ?? "PENDING")} /> },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={reviewAgency.isPending || String(row.approvalStatus ?? "") !== "PENDING"}
                      onClick={() => reviewAgency.mutate({ agencyId: String(row.id), action: "approve" })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={reviewAgency.isPending || String(row.approvalStatus ?? "") !== "PENDING"}
                      onClick={() => reviewAgency.mutate({ agencyId: String(row.id), action: "reject", reason: "Business verification incomplete" })}
                    >
                      Reject
                    </Button>
                  </div>
                ),
              },
            ]}
            data={agencies}
          />
        </Card>
      </div>

      <Card title="Approved Host Roster">
        <DataTable
          columns={[
            { key: "hostId", label: "Host ID" },
            { key: "publicUserId", label: "User ID", render: (row) => String(row.publicUserId ?? "-") },
            { key: "displayName", label: "Name" },
            { key: "type", label: "Type", render: (row) => <StatusBadge status={String(row.type ?? "PLATFORM")} /> },
            { key: "agencyCode", label: "Agency ID", render: (row) => String(row.agencyCode ?? "Platform") },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "APPROVED")} /> },
            { key: "approvedAt", label: "Approved", render: (row) => row.approvedAt ? formatDate(String(row.approvedAt)) : "-" },
          ]}
          data={hostRows}
        />
      </Card>
    </>
  );
}