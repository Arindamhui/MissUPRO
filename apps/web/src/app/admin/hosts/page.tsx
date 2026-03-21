"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, UserRoundCheck, UserRoundX, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/utils";
import { AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard, AdminModal, AdminPageHeader, AdminPanelCard, AdminPagination, AdminSearchField, AdminSelect, AdminStatusPill } from "@/features/admin/components/admin-ui";
import { useAdminHostsQuery, useAdminNotifier, useUpdateAdminHost } from "@/features/admin/hooks/use-admin-panel-api";

type HostRow = {
  id: string;
  hostId?: string | null;
  publicId?: string | null;
  userId: string;
  agencyId?: string | null;
  type: string;
  status: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
};

type AgencyRow = { id: string; agencyName: string; publicId?: string | null };

type ModelApplicationRow = {
  id: string;
  userId: string;
  displayName?: string | null;
  country?: string | null;
  city?: string | null;
  talentDescription?: string | null;
  status: string;
  submittedAt: string | Date;
};

export default function AdminHostsPage() {
  const notify = useAdminNotifier();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedHost, setSelectedHost] = useState<HostRow | null>(null);
  const [statusDraft, setStatusDraft] = useState("APPROVED");
  const [agencyDraft, setAgencyDraft] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const hostsQuery = useAdminHostsQuery(cursor, 20);
  const agenciesQuery = trpc.admin.listAgencies.useQuery({ limit: 100 }, { retry: false });
  const modelApplications = trpc.admin.listModelApplications.useQuery({ status: "PENDING", limit: 20 }, { retry: false });
  const approveApplication = trpc.admin.approveModelApplication.useMutation({
    onSuccess: async () => {
      notify.success("Host approved");
      await Promise.all([hostsQuery.refetch(), modelApplications.refetch()]);
    },
    onError(error: unknown) {
      notify.error("Approval failed", error instanceof Error ? error.message : "Unknown error");
    },
  });
  const rejectApplication = trpc.admin.rejectModelApplication.useMutation({
    onSuccess: async () => {
      notify.success("Application rejected");
      await modelApplications.refetch();
    },
    onError(error: unknown) {
      notify.error("Rejection failed", error instanceof Error ? error.message : "Unknown error");
    },
  });
  const updateHost = useUpdateAdminHost();

  const hostRows = ((hostsQuery.data?.items ?? []) as HostRow[]).filter((row) => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return true;
    return [row.hostId, row.publicId, row.userId, row.agencyId, row.type, row.status].some((value) => String(value ?? "").toLowerCase().includes(query));
  });
  const pendingRows = (modelApplications.data?.items ?? []) as ModelApplicationRow[];
  const agencies = ((agenciesQuery.data?.items ?? []) as AgencyRow[]) ?? [];

  const metrics = useMemo(() => ({
    totalHosts: hostRows.length,
    approvedHosts: hostRows.filter((row) => row.status === "APPROVED").length,
    agencyHosts: hostRows.filter((row) => row.type === "AGENCY").length,
    pendingApplications: pendingRows.length,
  }), [hostRows, pendingRows.length]);

  function openEditor(row: HostRow) {
    setSelectedHost(row);
    setStatusDraft(row.status || "APPROVED");
    setAgencyDraft(row.agencyId ?? "");
    setReviewNotes("");
  }

  async function saveHost() {
    if (!selectedHost) return;
    await updateHost.mutateAsync({
      hostId: selectedHost.id,
      payload: {
        status: statusDraft,
        agencyId: agencyDraft || null,
        reviewNotes: reviewNotes || null,
      },
    });
    setSelectedHost(null);
  }

  function goNext() {
    const nextCursor = hostsQuery.data?.nextCursor ?? undefined;
    if (!nextCursor) return;
    setCursorStack((current) => {
      const next = [...current];
      next[pageIndex + 1] = nextCursor;
      return next;
    });
    setCursor(nextCursor);
    setPageIndex((current) => current + 1);
  }

  function goPrevious() {
    if (pageIndex === 0) return;
    const nextPage = pageIndex - 1;
    setPageIndex(nextPage);
    setCursor(cursorStack[nextPage]);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Talent Control"
        title="Hosts & Models"
        description="Approve talent applications, change host status, and move approved creators between agency rosters."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Hosts In Roster" value={formatNumber(metrics.totalHosts)} icon={Users} />
        <AdminMetricCard label="Approved Hosts" value={formatNumber(metrics.approvedHosts)} icon={ShieldCheck} tone="emerald" />
        <AdminMetricCard label="Agency Hosts" value={formatNumber(metrics.agencyHosts)} icon={CheckCircle2} tone="sky" />
        <AdminMetricCard label="Pending Approvals" value={formatNumber(metrics.pendingApplications)} icon={UserRoundX} tone="amber" />
      </div>

      <AdminPanelCard
        title="Host Roster"
        subtitle="Live roster with admin status control and agency assignment."
        actions={<div className="w-full min-w-[260px] lg:w-80"><AdminSearchField value={search} onChange={setSearch} placeholder="Search host, user, status, agency" /></div>}
      >
        <AdminDataTable
          rows={hostRows}
          rowKey={(row) => row.id}
          isLoading={hostsQuery.isLoading}
          emptyMessage="No hosts found."
          columns={[
            { key: "publicId", label: "Host ID", sortable: true, render: (row) => <span className="font-mono text-xs text-slate-700">{row.publicId ?? row.hostId ?? "-"}</span> },
            { key: "userId", label: "User", render: (row) => <span className="font-mono text-xs text-slate-600">{row.userId}</span> },
            { key: "agencyId", label: "Agency", render: (row) => <span className="font-mono text-xs text-slate-600">{row.agencyId ?? "Independent"}</span> },
            { key: "type", label: "Type", sortable: true, render: (row) => row.type },
            { key: "status", label: "Status", sortable: true, render: (row) => <AdminStatusPill value={row.status} /> },
            { key: "createdAt", label: "Created", sortable: true, render: (row) => formatDate(row.createdAt) },
            { key: "actions", label: "", render: (row) => <AdminButton variant="ghost" onClick={() => openEditor(row)}>Manage</AdminButton> },
          ]}
        />
        <div className="mt-5">
          <AdminPagination pageLabel={`Page ${pageIndex + 1}`} onPrevious={goPrevious} onNext={goNext} disablePrevious={pageIndex === 0} disableNext={!hostsQuery.data?.nextCursor} />
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Pending Model Applications" subtitle="Approve or reject pending creator onboarding requests.">
        <AdminDataTable
          rows={pendingRows}
          rowKey={(row) => row.id}
          isLoading={modelApplications.isLoading}
          emptyMessage="No pending model applications."
          columns={[
            { key: "id", label: "Application", render: (row) => <span className="font-mono text-xs text-slate-700">{row.id.slice(0, 8)}</span> },
            { key: "userId", label: "User", render: (row) => <span className="font-mono text-xs text-slate-600">{row.userId.slice(0, 8)}</span> },
            { key: "country", label: "Location", render: (row) => [row.city, row.country].filter(Boolean).join(", ") || "-" },
            { key: "talentDescription", label: "Talent", render: (row) => <span className="line-clamp-2 max-w-md text-slate-600">{row.talentDescription ?? "-"}</span> },
            { key: "submittedAt", label: "Submitted", render: (row) => formatDate(row.submittedAt) },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex gap-2">
                  <AdminButton onClick={() => approveApplication.mutate({ applicationId: row.id })} disabled={approveApplication.isPending}>Approve</AdminButton>
                  <AdminButton variant="danger" onClick={() => rejectApplication.mutate({ applicationId: row.id, reason: "Rejected by admin review" })} disabled={rejectApplication.isPending}>Reject</AdminButton>
                </div>
              ),
            },
          ]}
        />
      </AdminPanelCard>

      <AdminModal open={Boolean(selectedHost)} onClose={() => setSelectedHost(null)} title="Manage Host" description="Update status and agency ownership for the selected host.">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Status">
            <AdminSelect value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Agency Assignment">
            <AdminSelect value={agencyDraft} onChange={(event) => setAgencyDraft(event.target.value)}>
              <option value="">Independent</option>
              {agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.agencyName}</option>)}
            </AdminSelect>
          </AdminField>
          <div className="md:col-span-2">
            <AdminField label="Review Notes">
              <AdminInput value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Internal moderation note" />
            </AdminField>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => setSelectedHost(null)}>Cancel</AdminButton>
          <AdminButton onClick={saveHost} disabled={updateHost.isPending}>{updateHost.isPending ? "Saving..." : "Save host"}</AdminButton>
        </div>
      </AdminModal>
    </div>
  );
}
