"use client";

import { useMemo, useState } from "react";
import { Shield, ShieldCheck, UserPlus, UserX } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard,
  AdminModal, AdminPageHeader, AdminPanelCard, AdminSearchField,
  AdminSelect, AdminStatusPill,
} from "@/features/admin/components/admin-ui";
import { useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";

type AdminRow = {
  id: string;
  userId: string;
  adminName: string;
  email?: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  loginAttemptsFailed: number;
  lockedUntil?: string | null;
  deletedAt?: string | null;
  createdAt: string;
};

type FormState = {
  userId: string;
  adminName: string;
  email: string;
};

const emptyForm: FormState = { userId: "", adminName: "", email: "" };

export default function SubAdminPage() {
  const notify = useAdminNotifier();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");

  const listQuery = trpc.admin.listSubAdmins.useQuery(undefined, { retry: false });
  const createMut = trpc.admin.createSubAdmin.useMutation({
    onSuccess: async () => { notify.success("Sub-admin created"); setShowModal(false); setForm(emptyForm); await listQuery.refetch(); },
    onError: (e: any) => notify.error("Failed", e.message),
  });
  const updateMut = trpc.admin.updateSubAdmin.useMutation({
    onSuccess: async () => { notify.success("Sub-admin updated"); await listQuery.refetch(); },
    onError: (e: any) => notify.error("Failed", e.message),
  });
  const deleteMut = trpc.admin.deleteSubAdmin.useMutation({
    onSuccess: async () => { notify.success("Sub-admin removed"); await listQuery.refetch(); },
    onError: (e: any) => notify.error("Failed", e.message),
  });

  const allRows = (listQuery.data ?? []) as AdminRow[];
  const rows = allRows.filter((r) => {
    if (!search) return !r.deletedAt;
    const q = search.toLowerCase();
    return !r.deletedAt && [r.adminName, r.email, r.userId].some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  const metrics = useMemo(() => ({
    total: allRows.filter((r) => !r.deletedAt).length,
    active: allRows.filter((r) => r.isActive && !r.deletedAt).length,
    mfa: allRows.filter((r) => r.mfaEnabled && !r.deletedAt).length,
    locked: allRows.filter((r) => r.lockedUntil && !r.deletedAt).length,
  }), [allRows]);

  function toggleActive(row: AdminRow) {
    updateMut.mutate({ adminId: row.id, isActive: !row.isActive });
  }
  function toggleMfa(row: AdminRow) {
    updateMut.mutate({ adminId: row.id, mfaEnabled: !row.mfaEnabled });
  }
  function removeAdmin(row: AdminRow) {
    if (confirm(`Remove sub-admin "${row.adminName}"?`)) {
      deleteMut.mutate({ adminId: row.id });
    }
  }
  function save() {
    createMut.mutate({ userId: form.userId, adminName: form.adminName, email: form.email || undefined });
  }

  const F = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Staff Management"
        title="Sub Admin Management"
        description="Create and manage admin accounts. Each sub-admin is linked to a platform user ID and can access the admin panel."
        actions={<AdminButton onClick={() => { setForm(emptyForm); setShowModal(true); }}><UserPlus className="mr-1 h-4 w-4" /> Add Sub Admin</AdminButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Admins" value={formatNumber(metrics.total)} icon={Shield} />
        <AdminMetricCard label="Active" value={formatNumber(metrics.active)} icon={ShieldCheck} tone="emerald" />
        <AdminMetricCard label="MFA Enabled" value={formatNumber(metrics.mfa)} icon={Shield} tone="sky" />
        <AdminMetricCard label="Locked" value={formatNumber(metrics.locked)} icon={UserX} tone="amber" />
      </div>

      <AdminPanelCard
        title="Admin Accounts"
        subtitle="All administrator accounts with access to this panel."
        actions={<div className="w-80"><AdminSearchField value={search} onChange={setSearch} placeholder="Search name, email, user ID..." /></div>}
      >
        <AdminDataTable
          rows={rows}
          rowKey={(r) => r.id}
          isLoading={listQuery.isLoading}
          emptyMessage="No sub-admins found."
          columns={[
            { key: "adminName", label: "Name", sortable: true, render: (r) => <span className="font-semibold">{r.adminName}</span> },
            { key: "email", label: "Email", render: (r) => r.email ?? "—" },
            { key: "userId", label: "User ID", render: (r) => <span className="font-mono text-xs text-slate-500">{r.userId.slice(0, 8)}…</span> },
            { key: "isActive", label: "Status", render: (r) => (
              <button onClick={() => toggleActive(r)} className="cursor-pointer">
                <AdminStatusPill value={r.isActive ? "ACTIVE" : "INACTIVE"} />
              </button>
            )},
            { key: "mfaEnabled", label: "MFA", render: (r) => (
              <button onClick={() => toggleMfa(r)} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${r.mfaEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {r.mfaEnabled ? "ON" : "OFF"}
              </button>
            )},
            { key: "lastLoginAt", label: "Last Login", render: (r) => r.lastLoginAt ? formatDate(new Date(r.lastLoginAt)) : "Never" },
            { key: "loginAttemptsFailed", label: "Failed", render: (r) => (
              <span className={r.loginAttemptsFailed > 3 ? "font-bold text-red-600" : ""}>{r.loginAttemptsFailed}</span>
            )},
            { key: "actions", label: "", render: (r) => (
              <AdminButton variant="ghost" onClick={() => removeAdmin(r)} className="text-red-600 hover:text-red-700">Remove</AdminButton>
            )},
          ]}
        />
      </AdminPanelCard>

      <AdminModal open={showModal} onClose={() => setShowModal(false)} title="Add Sub Admin">
        <div className="space-y-4">
          <AdminField label="User ID (UUID)"><AdminInput value={form.userId} onChange={(e) => F("userId", e.target.value)} placeholder="Existing platform user UUID" /></AdminField>
          <AdminField label="Admin Name"><AdminInput value={form.adminName} onChange={(e) => F("adminName", e.target.value)} placeholder="Display name" /></AdminField>
          <AdminField label="Email (optional)"><AdminInput value={form.email} onChange={(e) => F("email", e.target.value)} placeholder="admin@missu.pro" /></AdminField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => setShowModal(false)}>Cancel</AdminButton>
          <AdminButton onClick={save} disabled={createMut.isPending || !form.userId || !form.adminName}>Create Admin</AdminButton>
        </div>
      </AdminModal>
    </div>
  );
}
