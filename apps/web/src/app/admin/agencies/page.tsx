"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, FileCheck, HandCoins, SearchIcon, Users, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard,
  AdminModal, AdminPageHeader, AdminPanelCard, AdminSearchField,
  AdminStatusPill, AdminTabs,
} from "@/features/admin/components/admin-ui";
import { useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";

type AgencyRow = { id: string; agencyName: string; publicId?: string | null; agencyCode?: string | null; contactName?: string | null; contactEmail?: string | null; country?: string | null; commissionTier?: string | null; status?: string | null; approvalStatus?: string | null; createdAt?: string | Date };
type ApplicationRow = { id: string; agencyName: string; contactName?: string | null; contactEmail?: string | null; country?: string | null; status?: string | null; approvalStatus?: string | null; createdAt?: string | Date; applicantUserId?: string | null; createdAgencyId?: string | null };
type CommissionRow = { id: string; agencyId: string; hostUserId?: string | null; commissionAmountUsd?: number; grossRevenueUsd?: number; status?: string | null; periodStart?: string | Date };
type AgencyHostRow = { id: string; hostId?: string | null; publicId?: string | null; displayName?: string | null; email?: string | null; status?: string | null; joinedAt?: string | Date };

export default function AdminAgenciesPage() {
  const notify = useAdminNotifier();
  const [selectedAgency, setSelectedAgency] = useState<AgencyRow | null>(null);
  const [search, setSearch] = useState("");
  const [agencyTab, setAgencyTab] = useState("ALL");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const agenciesQuery = trpc.admin.listAgencies.useQuery({ limit: 100 }, { retry: false });
  const applicationsQuery = trpc.admin.listAgencyApplications.useQuery({ limit: 50 }, { retry: false });
  const commissionsQuery = trpc.admin.listAgencyCommissionRecords.useQuery({ limit: 50 }, { retry: false });
  const rosterQuery = trpc.admin.listAgencyHosts.useQuery(
    { agencyId: selectedAgency?.id ?? "00000000-0000-0000-0000-000000000000", limit: 50 },
    { enabled: Boolean(selectedAgency?.id), retry: false },
  );

  const approveAgency = trpc.admin.approveAgency.useMutation({
    onSuccess: async () => {
      notify.success("Agency approved successfully");
      await Promise.all([agenciesQuery.refetch(), applicationsQuery.refetch()]);
    },
    onError: (error: Error) => notify.error("Approval failed", error.message),
  });

  const approveApplication = trpc.admin.approveAgencyApplication.useMutation({
    onSuccess: async () => {
      notify.success("Agency application approved");
      await Promise.all([agenciesQuery.refetch(), applicationsQuery.refetch()]);
    },
    onError: (error: Error) => notify.error("Approval failed", error.message),
  });

  const rejectApplication = trpc.admin.rejectAgencyApplication.useMutation({
    onSuccess: async () => {
      notify.success("Agency rejected");
      setRejectModal(null);
      setRejectNotes("");
      await Promise.all([agenciesQuery.refetch(), applicationsQuery.refetch()]);
    },
    onError: (error: Error) => notify.error("Rejection failed", error.message),
  });

  const allAgencies = (agenciesQuery.data?.items ?? []) as AgencyRow[];
  const applications = (applicationsQuery.data?.items ?? []) as ApplicationRow[];
  const commissions = (commissionsQuery.data?.items ?? []) as CommissionRow[];
  const roster = (rosterQuery.data?.items ?? []) as AgencyHostRow[];
  const totalCommission = commissions.reduce((sum, row) => sum + Number(row.commissionAmountUsd ?? 0), 0);

  const metrics = useMemo(() => ({
    total: allAgencies.length,
    pending: allAgencies.filter((a) => String(a.approvalStatus ?? a.status ?? "").toUpperCase() === "PENDING").length,
    approved: allAgencies.filter((a) => {
      const s = String(a.approvalStatus ?? a.status ?? "").toUpperCase();
      return s === "APPROVED" || s === "ACTIVE";
    }).length,
    rejected: allAgencies.filter((a) => String(a.approvalStatus ?? a.status ?? "").toUpperCase() === "REJECTED").length,
  }), [allAgencies]);

  // Filter agencies by tab and search
  const filteredAgencies = allAgencies.filter((a) => {
    const status = String(a.approvalStatus ?? a.status ?? "").toUpperCase();
    if (agencyTab === "PENDING" && status !== "PENDING") return false;
    if (agencyTab === "APPROVED" && status !== "APPROVED" && status !== "ACTIVE") return false;
    if (agencyTab === "REJECTED" && status !== "REJECTED") return false;
    if (search) {
      const q = search.toLowerCase();
      return [a.agencyName, a.contactName, a.contactEmail, a.country, a.publicId, a.agencyCode].some((v) => String(v ?? "").toLowerCase().includes(q));
    }
    return true;
  });

  const isPending = (a: AgencyRow) => String(a.approvalStatus ?? a.status ?? "").toUpperCase() === "PENDING";

  function handleApprove(agency: AgencyRow) {
    // Use approveAgency (direct agency ID) since registerAgency creates agencies directly
    approveAgency.mutate({ agencyId: agency.id });
  }

  function handleReject(agency: AgencyRow) {
    setRejectModal({ id: agency.id, name: agency.agencyName });
    setRejectNotes("");
  }

  function confirmReject() {
    if (!rejectModal) return;
    rejectApplication.mutate({ applicationId: rejectModal.id, notes: rejectNotes || "Rejected by admin review" });
  }

  const agencyTabs = [
    { value: "ALL", label: `All (${allAgencies.length})` },
    { value: "PENDING", label: `Pending (${metrics.pending})` },
    { value: "APPROVED", label: `Approved (${metrics.approved})` },
    { value: "REJECTED", label: `Rejected (${metrics.rejected})` },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Partner Network"
        title="Agency Management"
        description="Review agency applications, approve or reject, inspect rosters, and monitor commission records."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Agencies" value={formatNumber(metrics.total)} icon={Building2} />
        <AdminMetricCard label="Pending Review" value={formatNumber(metrics.pending)} icon={FileCheck} tone="amber" />
        <AdminMetricCard label="Commission Records" value={formatNumber(commissions.length)} icon={HandCoins} tone="sky" />
        <AdminMetricCard label="Total Commission" value={formatCurrency(totalCommission)} icon={Users} tone="emerald" />
      </div>

      {/* Main Agency Table with Tabs */}
      <AdminPanelCard
        title="Agencies"
        subtitle="All agencies registered on the platform. Pending agencies require admin approval."
        actions={
          <div className="w-full min-w-[260px] lg:w-80">
            <AdminSearchField value={search} onChange={setSearch} placeholder="Search agency, contact, email, code..." />
          </div>
        }
      >
        <AdminTabs tabs={agencyTabs} value={agencyTab} onChange={setAgencyTab} />
        <AdminDataTable
          rows={filteredAgencies}
          rowKey={(row) => row.id}
          isLoading={agenciesQuery.isLoading}
          emptyMessage="No agencies found."
          columns={[
            {
              key: "agencyName", label: "Agency", sortable: true,
              render: (row) => (
                <div>
                  <p className="font-semibold text-slate-900">{row.agencyName}</p>
                  <p className="font-mono text-[11px] text-slate-400">{row.publicId ?? row.agencyCode ?? row.id.slice(0, 8)}</p>
                </div>
              ),
            },
            { key: "contactName", label: "Contact", render: (row) => row.contactName ?? "—" },
            { key: "contactEmail", label: "Email", render: (row) => row.contactEmail ? <span className="text-xs text-slate-600">{row.contactEmail}</span> : "—" },
            { key: "country", label: "Country", render: (row) => row.country ?? "—" },
            { key: "commissionTier", label: "Tier", render: (row) => row.commissionTier ? <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{row.commissionTier}</span> : "—" },
            {
              key: "approvalStatus", label: "Status", sortable: true,
              render: (row) => <AdminStatusPill value={row.approvalStatus ?? row.status ?? "PENDING"} />,
            },
            { key: "createdAt", label: "Registered", render: (row) => row.createdAt ? formatDate(row.createdAt) : "—" },
            {
              key: "actions", label: "",
              render: (row) => (
                <div className="flex items-center gap-2">
                  {isPending(row) && (
                    <>
                      <AdminButton
                        onClick={() => handleApprove(row)}
                        disabled={approveAgency.isPending || approveApplication.isPending}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </AdminButton>
                      <AdminButton
                        variant="danger"
                        onClick={() => handleReject(row)}
                        disabled={rejectApplication.isPending}
                        className="gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </AdminButton>
                    </>
                  )}
                  <AdminButton variant="ghost" onClick={() => setSelectedAgency(row)}>Roster</AdminButton>
                </div>
              ),
            },
          ]}
        />
      </AdminPanelCard>

      {/* Commission Ledger */}
      <AdminPanelCard title="Commission Ledger" subtitle="Revenue share records across agency partnerships.">
        <AdminDataTable
          rows={commissions}
          rowKey={(row) => row.id}
          isLoading={commissionsQuery.isLoading}
          emptyMessage="No commission records found."
          columns={[
            { key: "agencyId", label: "Agency", render: (row) => <span className="font-mono text-xs text-slate-600">{row.agencyId.slice(0, 12)}</span> },
            { key: "hostUserId", label: "Host", render: (row) => <span className="font-mono text-xs text-slate-600">{String(row.hostUserId ?? "—").slice(0, 12)}</span> },
            { key: "commissionAmountUsd", label: "Commission", sortable: true, render: (row) => formatCurrency(Number(row.commissionAmountUsd ?? 0)) },
            { key: "grossRevenueUsd", label: "Gross", sortable: true, render: (row) => formatCurrency(Number(row.grossRevenueUsd ?? 0)) },
            { key: "status", label: "Status", render: (row) => <AdminStatusPill value={row.status ?? "PENDING"} /> },
            { key: "periodStart", label: "Period", render: (row) => row.periodStart ? formatDate(row.periodStart) : "—" },
          ]}
        />
      </AdminPanelCard>

      {/* Agency Roster Modal */}
      <AdminModal open={Boolean(selectedAgency)} onClose={() => setSelectedAgency(null)} title={selectedAgency?.agencyName ?? "Agency Roster"} description="Current hosts assigned to this agency." size="lg">
        {selectedAgency && (
          <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-sm">
            <div><span className="font-medium text-slate-500">Agency ID:</span> <span className="font-mono text-slate-700">{selectedAgency.publicId ?? selectedAgency.agencyCode ?? selectedAgency.id.slice(0, 12)}</span></div>
            <div><span className="font-medium text-slate-500">Contact:</span> <span className="text-slate-700">{selectedAgency.contactName ?? "—"}</span></div>
            <div><span className="font-medium text-slate-500">Email:</span> <span className="text-slate-700">{selectedAgency.contactEmail ?? "—"}</span></div>
            <div><span className="font-medium text-slate-500">Country:</span> <span className="text-slate-700">{selectedAgency.country ?? "—"}</span></div>
            <div><span className="font-medium text-slate-500">Status:</span> <AdminStatusPill value={selectedAgency.approvalStatus ?? selectedAgency.status ?? "PENDING"} /></div>
            <div><span className="font-medium text-slate-500">Commission Tier:</span> <span className="text-slate-700">{selectedAgency.commissionTier ?? "Standard"}</span></div>
          </div>
        )}
        <AdminDataTable
          rows={roster}
          rowKey={(row) => row.id}
          isLoading={rosterQuery.isLoading}
          emptyMessage="No hosts are assigned to this agency yet."
          columns={[
            { key: "publicId", label: "Host", render: (row) => <div><p className="font-medium text-slate-900">{row.displayName ?? "Unknown host"}</p><p className="font-mono text-xs text-slate-500">{row.publicId ?? row.hostId ?? "—"}</p></div> },
            { key: "email", label: "Email", render: (row) => row.email ?? "—" },
            { key: "status", label: "Status", render: (row) => <AdminStatusPill value={row.status ?? "PENDING"} /> },
            { key: "joinedAt", label: "Joined", render: (row) => row.joinedAt ? formatDate(row.joinedAt) : "—" },
          ]}
        />
      </AdminModal>

      {/* Reject Confirmation Modal */}
      <AdminModal open={Boolean(rejectModal)} onClose={() => setRejectModal(null)} title="Reject Agency" description={`Are you sure you want to reject "${rejectModal?.name}"?`}>
        <div className="space-y-4">
          <AdminField label="Rejection Notes (optional)">
            <AdminInput
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection..."
            />
          </AdminField>
          <div className="flex justify-end gap-3">
            <AdminButton variant="secondary" onClick={() => setRejectModal(null)}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={confirmReject} disabled={rejectApplication.isPending}>
              {rejectApplication.isPending ? "Rejecting..." : "Confirm Reject"}
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
