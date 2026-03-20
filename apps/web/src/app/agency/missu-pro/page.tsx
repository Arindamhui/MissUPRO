"use client";

import { BadgeCheck, Building2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, DataTable, KpiCard, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

export default function MissuProAgencyPage() {
  const overview = trpc.missu.getAgencyOverview.useQuery(undefined, { retry: false });

  const agency = overview.data?.agency;
  const analytics = overview.data?.analytics ?? {
    totalHosts: 0,
    approvedHosts: 0,
    platformHosts: 0,
    pendingApplications: 0,
  };
  const roster = (overview.data?.roster ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="MissU Pro Agency Panel"
        description="Manage your approved host roster, track onboarding, and share your Agency ID with new talent."
      />

      <Card className="mb-6 bg-slate-950 text-white">
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Agency Access</div>
            <div className="mt-3 text-3xl font-semibold">{String(agency?.agencyCode ?? "Pending")}</div>
            <div className="mt-2 max-w-2xl text-sm text-slate-300">
              Share this Agency ID with hosts who select the agency-based onboarding route in the mobile app. Only approved agencies can link hosts.
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <div className="flex items-center justify-between"><span>Agency</span><span className="font-semibold">{String(agency?.agencyName ?? "-")}</span></div>
            <div className="flex items-center justify-between"><span>Contact</span><span className="font-semibold">{String(agency?.contactName ?? "-")}</span></div>
            <div className="flex items-center justify-between"><span>Status</span><StatusBadge status={String(agency?.approvalStatus ?? agency?.status ?? "PENDING")} /></div>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Roster Size" value={formatNumber(analytics.totalHosts)} icon={Users} />
        <KpiCard label="Approved Hosts" value={formatNumber(analytics.approvedHosts)} icon={BadgeCheck} />
        <KpiCard label="Platform Transfers" value={formatNumber(analytics.platformHosts)} icon={Building2} />
        <KpiCard label="Pending Requests" value={formatNumber(analytics.pendingApplications)} icon={Users} />
      </div>

      <Card title="Host Roster">
        <DataTable
          columns={[
            { key: "hostId", label: "Host ID" },
            { key: "publicUserId", label: "User ID", render: (row) => String(row.publicUserId ?? "-") },
            { key: "displayName", label: "Host" },
            { key: "email", label: "Email" },
            { key: "hostType", label: "Type", render: (row) => <StatusBadge status={String(row.hostType ?? "AGENCY")} /> },
            { key: "hostStatus", label: "Status", render: (row) => <StatusBadge status={String(row.hostStatus ?? "APPROVED")} /> },
            { key: "createdAt", label: "Joined", render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-" },
          ]}
          data={roster}
        />
      </Card>
    </>
  );
}