"use client";

import { useMemo, useState } from "react";
import { Coins, DollarSign, Layers3, Sparkles, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard,
  AdminModal, AdminPageHeader, AdminPanelCard, AdminSelect, AdminStatusPill,
} from "@/features/admin/components/admin-ui";
import { useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";

type PackageRow = {
  id: string;
  name: string;
  coinAmount: number;
  bonusCoins: number;
  priceUsd: string | number;
  currency: string;
  appleProductId?: string | null;
  googleProductId?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  regionScope?: unknown;
};

type FormState = {
  id?: string;
  name: string;
  coinAmount: string;
  bonusCoins: string;
  priceUsd: string;
  currency: string;
  appleProductId: string;
  googleProductId: string;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: string;
};

const emptyForm: FormState = {
  name: "", coinAmount: "", bonusCoins: "0", priceUsd: "", currency: "USD",
  appleProductId: "", googleProductId: "", isActive: true, isFeatured: false, displayOrder: "0",
};

export default function CoinPackagesPage() {
  const notify = useAdminNotifier();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const listQuery = trpc.admin.listCoinPackages.useQuery(undefined, { retry: false });
  const createMut = trpc.admin.createCoinPackage.useMutation({
    onSuccess: async () => { notify.success("Package created"); setShowModal(false); setForm(emptyForm); await listQuery.refetch(); },
    onError: (e: any) => notify.error("Failed", e.message),
  });
  const updateMut = trpc.admin.updateCoinPackage.useMutation({
    onSuccess: async () => { notify.success("Package updated"); setShowModal(false); await listQuery.refetch(); },
    onError: (e: any) => notify.error("Failed", e.message),
  });
  const deleteMut = trpc.admin.deleteCoinPackage.useMutation({
    onSuccess: async () => { notify.success("Package deactivated"); await listQuery.refetch(); },
    onError: (e: any) => notify.error("Failed", e.message),
  });

  const rows = (listQuery.data ?? []) as PackageRow[];
  const metrics = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.isActive).length,
    featured: rows.filter((r) => r.isFeatured).length,
    avgPrice: rows.length ? (rows.reduce((s, r) => s + Number(r.priceUsd), 0) / rows.length).toFixed(2) : "0.00",
  }), [rows]);

  function openCreate() { setForm(emptyForm); setShowModal(true); }
  function openEdit(row: PackageRow) {
    setForm({
      id: row.id, name: row.name, coinAmount: String(row.coinAmount), bonusCoins: String(row.bonusCoins),
      priceUsd: String(row.priceUsd), currency: row.currency, appleProductId: row.appleProductId ?? "",
      googleProductId: row.googleProductId ?? "", isActive: row.isActive, isFeatured: row.isFeatured,
      displayOrder: String(row.displayOrder),
    });
    setShowModal(true);
  }

  function save() {
    const payload = {
      name: form.name,
      coinAmount: Number(form.coinAmount),
      bonusCoins: Number(form.bonusCoins || 0),
      priceUsd: Number(form.priceUsd),
      currency: form.currency,
      appleProductId: form.appleProductId || undefined,
      googleProductId: form.googleProductId || undefined,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      displayOrder: Number(form.displayOrder || 0),
    };
    if (form.id) {
      updateMut.mutate({ packageId: form.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const F = (key: keyof FormState, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Monetization"
        title="Coin Packages"
        description="Set coin prices, bonus tiers, and IAP product IDs. Users buy coins to send gifts."
        actions={<AdminButton onClick={openCreate}>Create Package</AdminButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Packages" value={formatNumber(metrics.total)} icon={Coins} />
        <AdminMetricCard label="Active" value={formatNumber(metrics.active)} icon={Layers3} tone="emerald" />
        <AdminMetricCard label="Featured" value={formatNumber(metrics.featured)} icon={Star} tone="amber" />
        <AdminMetricCard label="Avg Price USD" value={`$${metrics.avgPrice}`} icon={DollarSign} tone="sky" />
      </div>

      <AdminPanelCard title="Coin Package Catalog" subtitle="All coin packages available for purchase.">
        <AdminDataTable
          rows={rows}
          rowKey={(r) => r.id}
          isLoading={listQuery.isLoading}
          emptyMessage="No coin packages configured."
          columns={[
            { key: "name", label: "Package", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "coinAmount", label: "Coins", sortable: true, render: (r) => <span className="font-mono">{formatNumber(r.coinAmount)}</span> },
            { key: "bonusCoins", label: "Bonus", sortable: true, render: (r) => r.bonusCoins > 0 ? <span className="text-emerald-600 font-semibold">+{r.bonusCoins}</span> : "—" },
            { key: "priceUsd", label: "Price", sortable: true, render: (r) => formatCurrency(Number(r.priceUsd)) },
            { key: "isFeatured", label: "Featured", render: (r) => r.isFeatured ? <Sparkles className="h-4 w-4 text-amber-500" /> : "—" },
            { key: "isActive", label: "Status", render: (r) => <AdminStatusPill value={r.isActive ? "ACTIVE" : "INACTIVE"} /> },
            { key: "actions", label: "", render: (r) => (
              <div className="flex gap-2">
                <AdminButton variant="ghost" onClick={() => openEdit(r)}>Edit</AdminButton>
                {r.isActive && <AdminButton variant="danger" onClick={() => deleteMut.mutate({ packageId: r.id })}>Deactivate</AdminButton>}
              </div>
            )},
          ]}
        />
      </AdminPanelCard>

      <AdminModal open={showModal} onClose={() => setShowModal(false)} title={form.id ? "Edit Coin Package" : "Create Coin Package"}>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Name"><AdminInput value={form.name} onChange={(e) => F("name", e.target.value)} placeholder="Starter Pack" /></AdminField>
          <AdminField label="Coin Amount"><AdminInput type="number" value={form.coinAmount} onChange={(e) => F("coinAmount", e.target.value)} placeholder="100" /></AdminField>
          <AdminField label="Bonus Coins"><AdminInput type="number" value={form.bonusCoins} onChange={(e) => F("bonusCoins", e.target.value)} placeholder="0" /></AdminField>
          <AdminField label="Price USD"><AdminInput type="number" value={form.priceUsd} onChange={(e) => F("priceUsd", e.target.value)} placeholder="0.99" /></AdminField>
          <AdminField label="Currency"><AdminInput value={form.currency} onChange={(e) => F("currency", e.target.value)} placeholder="USD" /></AdminField>
          <AdminField label="Display Order"><AdminInput type="number" value={form.displayOrder} onChange={(e) => F("displayOrder", e.target.value)} /></AdminField>
          <AdminField label="Apple Product ID"><AdminInput value={form.appleProductId} onChange={(e) => F("appleProductId", e.target.value)} placeholder="com.missu.coins.100" /></AdminField>
          <AdminField label="Google Product ID"><AdminInput value={form.googleProductId} onChange={(e) => F("googleProductId", e.target.value)} placeholder="missu_coins_100" /></AdminField>
          <AdminField label="Active">
            <AdminSelect value={form.isActive ? "true" : "false"} onChange={(e) => F("isActive", e.target.value === "true")}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Featured">
            <AdminSelect value={form.isFeatured ? "true" : "false"} onChange={(e) => F("isFeatured", e.target.value === "true")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </AdminSelect>
          </AdminField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => setShowModal(false)}>Cancel</AdminButton>
          <AdminButton onClick={save} disabled={createMut.isPending || updateMut.isPending}>{form.id ? "Update" : "Create"} Package</AdminButton>
        </div>
      </AdminModal>
    </div>
  );
}
