"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Clock, ShieldCheck, UserRoundX, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard,
  AdminModal, AdminPageHeader, AdminPanelCard, AdminPagination, AdminSearchField,
  AdminSelect, AdminStatusPill, AdminTabs,
} from "@/features/admin/components/admin-ui";
import { useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";

type HostRequestRow = {
  id: string;
  userId: string;
  agencyId?: string | null;
  applicationType: string;
  status: string;
  agencyCodeSnapshot?: string | null;
  talentDetailsJson: unknown;
  profileInfoJson: unknown;
  idProofUrlsJson: unknown;
  reviewNotes?: string | null;
  submittedAt: string | Date;
  reviewedAt?: string | Date | null;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  agencyName?: string | null;
};

export default function HostRequestsPage() {
  const notify = useAdminNotifier();
  const [tab, setTab] = useState("PENDING");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<HostRequestRow | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const listQuery = trpc.admin.listHostRequests.useQuery(
    { status: tab as "PENDING" | "APPROVED" | "REJECTED", cursor, limit: 20 },
    { retry: false },
  );

  const approveMut = trpc.missu.reviewHostApplication.useMutation({
    onSuccess: async () => { notify.success("Host approved"); setSelected(null); await listQuery.refetch(); },
    onError: (error: any) => notify.error("Failed", error.message),
  });
  const rejectMut = trpc.missu.reviewHostApplication.useMutation({
    onSuccess: async () => { notify.success("Host application rejected"); setSelected(null); await listQuery.refetch(); },
    onError: (error: any) => notify.error("Failed", error.message),
  });

  const rows = ((listQuery.data?.items ?? []) as HostRequestRow[]).filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [row.displayName, row.email, row.userId, row.agencyName, row.applicationType].some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  const metrics = useMemo(() => ({
    total: rows.length,
    platform: rows.filter((r) => r.applicationType === "PLATFORM").length,
    agency: rows.filter((r) => r.applicationType === "AGENCY").length,
  }), [rows]);

  function goNext() {
    const nc = listQuery.data?.nextCursor ?? undefined;
    if (!nc) return;
    setCursorStack((s) => { const n = [...s]; n[pageIndex + 1] = nc; return n; });
    setCursor(nc);
    setPageIndex((i) => i + 1);
  }

  function goPrev() {
    if (pageIndex === 0) return;
    const np = pageIndex - 1;
    setPageIndex(np);
    setCursor(cursorStack[np]);
  }

  function changeTab(newTab: string) {
    setTab(newTab);
    setCursor(undefined);
    setCursorStack([undefined]);
    setPageIndex(0);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Talent Onboarding"
        title="Host Requests"
        description="Review, approve, or reject host applications. Independent hosts get H-IDs, agency hosts get AH-IDs."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Requests" value={formatNumber(metrics.total)} icon={Users} />
        <AdminMetricCard label="Independent" value={formatNumber(metrics.platform)} icon={ClipboardCheck} tone="emerald" />
        <AdminMetricCard label="Agency" value={formatNumber(metrics.agency)} icon={ShieldCheck} tone="sky" />
        <AdminMetricCard label="Pending Review" value={formatNumber(tab === "PENDING" ? metrics.total : 0)} icon={Clock} tone="amber" />
      </div>

      <AdminTabs
        value={tab}
        onChange={changeTab}
        tabs={[
          { value: "PENDING", label: "Pending" },
          { value: "APPROVED", label: "Approved" },
          { value: "REJECTED", label: "Rejected" },
        ]}
      />

      <AdminPanelCard
        title={`${tab} Host Requests`}
        subtitle="Click on a row to inspect application documents."
        actions={<div className="w-full min-w-[260px] lg:w-80"><AdminSearchField value={search} onChange={setSearch} placeholder="Search name, email, type..." /></div>}
      >
        <AdminDataTable
          rows={rows}
          rowKey={(r) => r.id}
          isLoading={listQuery.isLoading}
          emptyMessage="No host requests found."
          columns={[
            { key: "displayName", label: "Applicant", sortable: true, render: (r) => (
              <div>
                <p className="font-medium text-slate-900">{r.displayName ?? "—"}</p>
                <p className="text-xs text-slate-500">{r.email ?? r.userId.slice(0, 8)}</p>
              </div>
            )},
            { key: "applicationType", label: "Type", sortable: true, render: (r) => (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${r.applicationType === "AGENCY" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>
                {r.applicationType}
              </span>
            )},
            { key: "agencyName", label: "Agency", render: (r) => r.agencyName ?? "Independent" },
            { key: "status", label: "Status", sortable: true, render: (r) => <AdminStatusPill value={r.status} /> },
            { key: "submittedAt", label: "Submitted", sortable: true, render: (r) => formatDate(r.submittedAt) },
            { key: "actions", label: "", render: (r) => (
              <div className="flex gap-2">
                <AdminButton variant="ghost" onClick={() => { setSelected(r); setReviewNotes(""); }}>View</AdminButton>
                {r.status === "PENDING" && (
                  <>
                    <AdminButton onClick={() => approveMut.mutate({ applicationId: r.id, action: "approve" })} disabled={approveMut.isPending}>Approve</AdminButton>
                    <AdminButton variant="danger" onClick={() => rejectMut.mutate({ applicationId: r.id, action: "reject", reason: "Rejected" })} disabled={rejectMut.isPending}>Reject</AdminButton>
                  </>
                )}
              </div>
            )},
          ]}
        />
        <div className="mt-5">
          <AdminPagination pageLabel={`Page ${pageIndex + 1}`} onPrevious={goPrev} onNext={goNext} disablePrevious={pageIndex === 0} disableNext={!listQuery.data?.nextCursor} />
        </div>
      </AdminPanelCard>

      <AdminModal open={Boolean(selected)} onClose={() => setSelected(null)} title="Host Application Detail" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Applicant">{selected.displayName ?? selected.userId}</AdminField>
              <AdminField label="Email">{selected.email ?? "—"}</AdminField>
              <AdminField label="Type"><span className="font-semibold">{selected.applicationType}</span></AdminField>
              <AdminField label="Agency">{selected.agencyName ?? "Independent"}</AdminField>
              <AdminField label="Agency Code">{selected.agencyCodeSnapshot ?? "—"}</AdminField>
              <AdminField label="Status"><AdminStatusPill value={selected.status} /></AdminField>
              <AdminField label="Submitted">{formatDate(selected.submittedAt)}</AdminField>
              <AdminField label="Reviewed">{selected.reviewedAt ? formatDate(selected.reviewedAt) : "—"}</AdminField>
            </div>

            <AdminField label="Talent Details">
              <pre className="max-h-40 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(selected.talentDetailsJson, null, 2)}
              </pre>
            </AdminField>

            <AdminField label="Profile Info">
              <pre className="max-h-40 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(selected.profileInfoJson, null, 2)}
              </pre>
            </AdminField>

            <AdminField label="ID Proof">
              <pre className="max-h-40 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(selected.idProofUrlsJson, null, 2)}
              </pre>
            </AdminField>

            {selected.status === "PENDING" && (
              <>
                <AdminField label="Review Notes">
                  <AdminInput value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Optional internal note" />
                </AdminField>
                <div className="flex justify-end gap-3">
                  <AdminButton variant="secondary" onClick={() => setSelected(null)}>Cancel</AdminButton>
                  <AdminButton variant="danger" onClick={() => rejectMut.mutate({ applicationId: selected.id, action: "reject", reason: reviewNotes || "Rejected" })} disabled={rejectMut.isPending}>Reject</AdminButton>
                  <AdminButton onClick={() => approveMut.mutate({ applicationId: selected.id, action: "approve", reason: reviewNotes || undefined })} disabled={approveMut.isPending}>Approve & Generate Host ID</AdminButton>
                </div>
              </>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
}
