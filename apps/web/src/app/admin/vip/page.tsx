"use client";

import { useMemo, useState } from "react";
import { Crown, ShieldCheck, Sparkles, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard, AdminModal, AdminPageHeader, AdminPanelCard, AdminSelect, AdminStatusPill } from "@/features/admin/components/admin-ui";
import { useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";

type VipPackageRow = { id: string; tierCode: string; name: string; price: number; coinPrice: number; durationDays: number; isActive: boolean; displayOrder?: number | null };
type VipSubscriptionRow = { id: string; userId: string; tierCode?: string | null; status: string; currentPeriodStart?: string | Date; currentPeriodEnd?: string | Date };

type PackageForm = {
  id?: string;
  tierCode: string;
  name: string;
  price: string;
  coinPrice: string;
  durationDays: string;
  displayOrder: string;
  isActive: boolean;
};

const emptyForm: PackageForm = {
  tierCode: "",
  name: "",
  price: "9.99",
  coinPrice: "999",
  durationDays: "30",
  displayOrder: "0",
  isActive: true,
};

export default function VipManagementPage() {
  const notify = useAdminNotifier();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const packagesQuery = trpc.admin.listVipPackages.useQuery(undefined, { retry: false });
  const subscriptionsQuery = trpc.admin.listVipSubscriptions.useQuery({ limit: 50 }, { retry: false });
  const createPackage = trpc.admin.createVipPackage.useMutation({
    onSuccess: async () => {
      notify.success("VIP package created");
      setOpen(false);
      setForm(emptyForm);
      await packagesQuery.refetch();
    },
    onError: (error: Error) => notify.error("Package creation failed", error.message),
  });
  const updatePackage = trpc.admin.updateVipPackage.useMutation({
    onSuccess: async () => {
      notify.success("VIP package updated");
      setOpen(false);
      setForm(emptyForm);
      await packagesQuery.refetch();
    },
    onError: (error: Error) => notify.error("Package update failed", error.message),
  });

  const packageRows = (packagesQuery.data ?? []) as VipPackageRow[];
  const subscriptionRows = (subscriptionsQuery.data?.items ?? []) as VipSubscriptionRow[];
  const metrics = useMemo(() => ({
    packages: packageRows.length,
    activePackages: packageRows.filter((item) => item.isActive).length,
    subscribers: subscriptionRows.length,
    activeSubscribers: subscriptionRows.filter((item) => item.status === "ACTIVE").length,
  }), [packageRows, subscriptionRows]);

  function openForEdit(row?: VipPackageRow) {
    if (!row) {
      setForm(emptyForm);
      setOpen(true);
      return;
    }
    setForm({
      id: row.id,
      tierCode: row.tierCode,
      name: row.name,
      price: String(row.price),
      coinPrice: String(row.coinPrice),
      durationDays: String(row.durationDays),
      displayOrder: String(row.displayOrder ?? 0),
      isActive: row.isActive,
    });
    setOpen(true);
  }

  function savePackage() {
    const payload = {
      tierCode: form.tierCode,
      name: form.name,
      price: Number(form.price),
      coinPrice: Number(form.coinPrice),
      durationDays: Number(form.durationDays),
      displayOrder: Number(form.displayOrder),
      benefits: {},
      isActive: form.isActive,
    };
    if (form.id) {
      updatePackage.mutate({ packageId: form.id, data: payload });
      return;
    }
    createPackage.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Premium Access"
        title="VIP"
        description="Configure premium plans and watch the active subscriber base across the platform."
        actions={<AdminButton onClick={() => openForEdit()}>Create Package</AdminButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="VIP Packages" value={formatNumber(metrics.packages)} icon={Crown} />
        <AdminMetricCard label="Active Packages" value={formatNumber(metrics.activePackages)} icon={ShieldCheck} tone="emerald" />
        <AdminMetricCard label="Subscribers" value={formatNumber(metrics.subscribers)} icon={Users} tone="sky" />
        <AdminMetricCard label="Active Subscribers" value={formatNumber(metrics.activeSubscribers)} icon={Sparkles} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanelCard title="VIP Packages" subtitle="Create or edit the public package catalog.">
          <AdminDataTable
            rows={packageRows}
            rowKey={(row) => row.id}
            isLoading={packagesQuery.isLoading}
            emptyMessage="No VIP packages configured."
            columns={[
              { key: "name", label: "Package", sortable: true, render: (row) => <div><p className="font-medium text-slate-900">{row.name}</p><p className="font-mono text-xs text-slate-500">{row.tierCode}</p></div> },
              { key: "price", label: "USD", sortable: true, render: (row) => formatCurrency(row.price) },
              { key: "coinPrice", label: "Coins", sortable: true, render: (row) => formatNumber(row.coinPrice) },
              { key: "durationDays", label: "Days", sortable: true, render: (row) => formatNumber(row.durationDays) },
              { key: "isActive", label: "Status", render: (row) => <AdminStatusPill value={row.isActive ? "ACTIVE" : "INACTIVE"} /> },
              { key: "actions", label: "", render: (row) => <AdminButton variant="ghost" onClick={() => openForEdit(row)}>Edit</AdminButton> },
            ]}
          />
        </AdminPanelCard>

        <AdminPanelCard title="Active Subscriptions" subtitle="Recent VIP subscription records and current subscription windows.">
          <AdminDataTable
            rows={subscriptionRows}
            rowKey={(row) => row.id}
            isLoading={subscriptionsQuery.isLoading}
            emptyMessage="No VIP subscriptions found."
            columns={[
              { key: "userId", label: "User", render: (row) => <span className="font-mono text-xs text-slate-600">{row.userId.slice(0, 8)}</span> },
              { key: "tierCode", label: "Tier", render: (row) => row.tierCode ?? "-" },
              { key: "status", label: "Status", render: (row) => <AdminStatusPill value={row.status} /> },
              { key: "currentPeriodStart", label: "Started", render: (row) => row.currentPeriodStart ? formatDate(row.currentPeriodStart) : "-" },
              { key: "currentPeriodEnd", label: "Ends", render: (row) => row.currentPeriodEnd ? formatDate(row.currentPeriodEnd) : "-" },
            ]}
          />
        </AdminPanelCard>
      </div>

      <AdminModal open={open} onClose={() => setOpen(false)} title={form.id ? "Edit VIP Package" : "Create VIP Package"} description="Configure pricing, duration, and activation for a premium package.">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Tier Code" hint={form.id ? "Tier code cannot be changed" : "Unique code (e.g. VIP, PREMIUM). If code exists, it will update the existing package."}><AdminInput value={form.tierCode} onChange={(event) => setForm((current) => ({ ...current, tierCode: event.target.value }))} placeholder="e.g. VIP, PREMIUM, GOLD" disabled={Boolean(form.id)} /></AdminField>
          <AdminField label="Name"><AdminInput value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Display name" /></AdminField>
          <AdminField label="Price (USD)"><AdminInput type="number" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} /></AdminField>
          <AdminField label="Coin Price"><AdminInput type="number" value={form.coinPrice} onChange={(event) => setForm((current) => ({ ...current, coinPrice: event.target.value }))} /></AdminField>
          <AdminField label="Duration Days"><AdminInput type="number" value={form.durationDays} onChange={(event) => setForm((current) => ({ ...current, durationDays: event.target.value }))} /></AdminField>
          <AdminField label="Display Order"><AdminInput type="number" value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} /></AdminField>
          <div className="md:col-span-2">
            <AdminField label="Status"><AdminSelect value={form.isActive ? "ACTIVE" : "INACTIVE"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "ACTIVE" }))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></AdminSelect></AdminField>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => setOpen(false)}>Cancel</AdminButton>
          <AdminButton onClick={savePackage} disabled={createPackage.isPending || updatePackage.isPending}>{createPackage.isPending || updatePackage.isPending ? "Saving..." : "Save Package"}</AdminButton>
        </div>
      </AdminModal>
    </div>
  );
}
