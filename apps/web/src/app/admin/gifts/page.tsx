"use client";

import { useMemo, useState } from "react";
import { Diamond, Gift, ImagePlus, Layers3, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatNumber } from "@/lib/utils";
import { AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard, AdminModal, AdminPageHeader, AdminPanelCard, AdminSelect, AdminStatusPill, AdminTabs } from "@/features/admin/components/admin-ui";
import { useAdminNotifier, useGiftUpload } from "@/features/admin/hooks/use-admin-panel-api";

type GiftContextKey = "ALL" | "LIVE" | "CALL" | "GROUP_AUDIO" | "PARTY";

type GiftFormState = {
  id?: string;
  name: string;
  iconUrl: string;
  coinPrice: string;
  diamondCredit: string;
  category: string;
  effectTier: string;
  displayOrder: string;
  context: GiftContextKey;
  isActive: boolean;
};

type GiftRow = {
  id: string;
  giftCode: string;
  name: string;
  iconUrl: string;
  coinPrice: number;
  diamondCredit: number;
  category?: string | null;
  effectTier: string;
  displayOrder?: number | null;
  isActive: boolean;
  supportedContextsJson?: string[] | null;
};

const initialForm: GiftFormState = {
  name: "",
  iconUrl: "",
  coinPrice: "",
  diamondCredit: "",
  category: "STANDARD",
  effectTier: "STANDARD",
  displayOrder: "0",
  context: "ALL",
  isActive: true,
};

const CONTEXT_MAP: Record<GiftContextKey, string[]> = {
  ALL: ["LIVE_STREAM", "VIDEO_CALL", "VOICE_CALL", "CHAT_CONVERSATION", "PK_BATTLE", "GROUP_AUDIO", "PARTY"],
  LIVE: ["LIVE_STREAM", "PK_BATTLE"],
  CALL: ["VIDEO_CALL", "VOICE_CALL", "CHAT_CONVERSATION"],
  GROUP_AUDIO: ["GROUP_AUDIO"],
  PARTY: ["PARTY"],
};

function inferContext(value: string[] | null | undefined): GiftContextKey {
  const normalized = [...(value ?? [])].sort().join(",");
  for (const [key, contexts] of Object.entries(CONTEXT_MAP)) {
    if ([...contexts].sort().join(",") === normalized) {
      return key as GiftContextKey;
    }
  }
  return "ALL";
}

export default function GiftsPage() {
  const notify = useAdminNotifier();
  const [tab, setTab] = useState("catalog");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [form, setForm] = useState<GiftFormState>(initialForm);
  const [uploadingFileName, setUploadingFileName] = useState("");

  const catalog = trpc.admin.listGifts.useQuery(undefined, { retry: false });
  const giftUpload = useGiftUpload();
  const createGift = trpc.admin.createGift.useMutation({
    onSuccess: async () => {
      notify.success("Gift created");
      setShowGiftModal(false);
      setForm(initialForm);
      await catalog.refetch();
    },
    onError: (error: Error) => notify.error("Gift creation failed", error.message),
  });
  const updateGift = trpc.admin.updateGift.useMutation({
    onSuccess: async () => {
      notify.success("Gift updated");
      setShowGiftModal(false);
      setForm(initialForm);
      await catalog.refetch();
    },
    onError: (error: Error) => notify.error("Gift update failed", error.message),
  });
  const deleteGift = trpc.admin.deleteGift.useMutation({
    onSuccess: async () => {
      notify.success("Gift removed");
      await catalog.refetch();
    },
    onError: (error: Error) => notify.error("Gift removal failed", error.message),
  });

  const giftRows = (catalog.data ?? []) as GiftRow[];
  const metrics = useMemo(() => ({
    catalogItems: giftRows.length,
    activeItems: giftRows.filter((row) => row.isActive).length,
    premiumItems: giftRows.filter((row) => row.effectTier !== "STANDARD").length,
    averageCoinPrice: giftRows.length ? Math.round(giftRows.reduce((sum, row) => sum + row.coinPrice, 0) / giftRows.length) : 0,
    averageDiamondCredit: giftRows.length ? Math.round(giftRows.reduce((sum, row) => sum + row.diamondCredit, 0) / giftRows.length) : 0,
  }), [giftRows]);

  function openCreateModal() {
    setForm(initialForm);
    setShowGiftModal(true);
  }

  function openEditModal(gift: GiftRow) {
    setForm({
      id: gift.id,
      name: gift.name,
      iconUrl: gift.iconUrl,
      coinPrice: String(gift.coinPrice),
      diamondCredit: String(gift.diamondCredit),
      category: String(gift.category ?? "STANDARD"),
      effectTier: gift.effectTier,
      displayOrder: String(gift.displayOrder ?? 0),
      context: inferContext(gift.supportedContextsJson),
      isActive: gift.isActive,
    });
    setShowGiftModal(true);
  }

  function saveGift() {
    const payload = {
      name: form.name,
      iconUrl: form.iconUrl,
      coinPrice: Number(form.coinPrice),
      diamondCredit: Number(form.diamondCredit || 0),
      category: form.category,
      effectTier: form.effectTier as "STANDARD" | "PREMIUM" | "LEGENDARY",
      displayOrder: Number(form.displayOrder || 0),
      supportedContexts: CONTEXT_MAP[form.context] as Array<
        "LIVE_STREAM" | "VIDEO_CALL" | "VOICE_CALL" | "CHAT_CONVERSATION" | "PK_BATTLE" | "GROUP_AUDIO" | "PARTY"
      >,
      isActive: form.isActive,
    };

    if (form.id) {
      updateGift.mutate({ giftId: form.id, data: payload });
      return;
    }

    createGift.mutate(payload);
  }

  async function handleAssetUpload(file: File | null) {
    if (!file) return;
    setUploadingFileName(file.name);
    try {
      const result = await giftUpload.mutateAsync(file);
      setForm((current) => ({ ...current, iconUrl: String((result as { url?: string }).url ?? "") }));
    } finally {
      setUploadingFileName("");
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catalog Control"
        title="Gift Catalog"
        description="Control gift pricing, asset uploads, effect tiers, activation state, and delivery context coverage."
        actions={<AdminButton onClick={openCreateModal}>Create Gift</AdminButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Catalog Items" value={formatNumber(metrics.catalogItems)} icon={Gift} />
        <AdminMetricCard label="Active Gifts" value={formatNumber(metrics.activeItems)} icon={Layers3} tone="emerald" />
        <AdminMetricCard label="Avg Coin Price" value={formatNumber(metrics.averageCoinPrice)} icon={Sparkles} tone="amber" />
        <AdminMetricCard label="Avg Diamond Credit" value={formatNumber(metrics.averageDiamondCredit)} icon={Diamond} tone="sky" />
      </div>

      <AdminTabs value={tab} onChange={setTab} tabs={[{ value: "catalog", label: "Catalog" }, { value: "economics", label: "Economics" }, { value: "coverage", label: "Context Coverage" }]} />

      {tab === "catalog" ? (
        <AdminPanelCard title="Gift Inventory" subtitle="Editable inventory of all active and archived gifts.">
          <AdminDataTable
            rows={giftRows}
            rowKey={(row) => row.id}
            isLoading={catalog.isLoading}
            emptyMessage="No gifts configured yet."
            columns={[
              { key: "name", label: "Gift", sortable: true, render: (row) => <div><p className="font-medium text-slate-900">{row.name}</p><p className="font-mono text-xs text-slate-500">{row.giftCode}</p></div> },
              { key: "coinPrice", label: "Coins", sortable: true, render: (row) => formatNumber(row.coinPrice) },
              { key: "diamondCredit", label: "Diamonds", sortable: true, render: (row) => formatNumber(row.diamondCredit) },
              { key: "effectTier", label: "Tier", render: (row) => row.effectTier },
              { key: "displayOrder", label: "Order", sortable: true, render: (row) => formatNumber(Number(row.displayOrder ?? 0)) },
              { key: "isActive", label: "Status", render: (row) => <AdminStatusPill value={row.isActive ? "ACTIVE" : "INACTIVE"} /> },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <div className="flex gap-2">
                    <AdminButton variant="ghost" onClick={() => openEditModal(row)}>Edit</AdminButton>
                    <AdminButton variant="danger" onClick={() => deleteGift.mutate({ giftId: row.id })} disabled={deleteGift.isPending}>Delete</AdminButton>
                  </div>
                ),
              },
            ]}
          />
        </AdminPanelCard>
      ) : null}

      {tab === "economics" ? (
        <AdminPanelCard title="Catalog Economics" subtitle="Pricing footprint and premium mix across the current catalog.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-lg border p-4">
              <p className="mb-1 text-slate-500">Total Coin Price Sum</p>
              <p className="text-2xl font-semibold">{formatNumber(giftRows.reduce((sum, row) => sum + row.coinPrice, 0))}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-1 text-slate-500">Total Diamond Credit Sum</p>
              <p className="text-2xl font-semibold">{formatNumber(giftRows.reduce((sum, row) => sum + row.diamondCredit, 0))}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-1 text-slate-500">Premium Share</p>
              <p className="text-2xl font-semibold">
                {metrics.catalogItems ? `${Math.round((metrics.premiumItems / metrics.catalogItems) * 100)}%` : "0%"}
              </p>
            </div>
          </div>
        </AdminPanelCard>
      ) : null}

      {tab === "coverage" ? (
        <AdminPanelCard title="Context Coverage" subtitle="Supported delivery contexts for each gift item.">
          <div className="space-y-3 text-sm">
            {giftRows.map((row) => (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{row.name}</p>
                  <AdminStatusPill value={row.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>
                <p className="mt-2 text-slate-500">
                  {Array.isArray(row.supportedContextsJson) && row.supportedContextsJson.length > 0
                    ? row.supportedContextsJson.join(", ")
                    : "No contexts configured"}
                </p>
              </div>
            ))}
          </div>
        </AdminPanelCard>
      ) : null}

      <AdminModal open={showGiftModal} onClose={() => setShowGiftModal(false)} title={form.id ? "Edit Gift" : "Create Gift"} description="Configure the presentation, pricing, and routing profile for this gift.">
        <div className="space-y-4">
          <AdminField label="Gift Name"><AdminInput value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></AdminField>
          <AdminField label="Asset URL"><AdminInput value={form.iconUrl} onChange={(event) => setForm((current) => ({ ...current, iconUrl: event.target.value }))} placeholder="https://..." /></AdminField>
          <AdminField label="Upload Asset" hint="Image only, max 5MB.">
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-slate-500 hover:text-slate-900">
              <ImagePlus className="h-4 w-4" />
              <span>{uploadingFileName || (giftUpload.isPending ? "Uploading..." : "Choose image")}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleAssetUpload(event.target.files?.[0] ?? null)} />
            </label>
          </AdminField>
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Coin Price"><AdminInput type="number" value={form.coinPrice} onChange={(event) => setForm((current) => ({ ...current, coinPrice: event.target.value }))} /></AdminField>
            <AdminField label="Diamond Credit"><AdminInput type="number" value={form.diamondCredit} onChange={(event) => setForm((current) => ({ ...current, diamondCredit: event.target.value }))} /></AdminField>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AdminField label="Category"><AdminSelect value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}><option value="STANDARD">Standard</option><option value="PREMIUM">Premium</option><option value="EVENT">Event</option><option value="SEASONAL">Seasonal</option></AdminSelect></AdminField>
            <AdminField label="Effect Tier"><AdminSelect value={form.effectTier} onChange={(event) => setForm((current) => ({ ...current, effectTier: event.target.value }))}><option value="STANDARD">Standard</option><option value="PREMIUM">Premium</option><option value="LEGENDARY">Legendary</option></AdminSelect></AdminField>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AdminField label="Context Profile"><AdminSelect value={form.context} onChange={(event) => setForm((current) => ({ ...current, context: event.target.value as GiftContextKey }))}><option value="ALL">All Contexts</option><option value="LIVE">Live / PK</option><option value="CALL">Calls / Chat</option><option value="GROUP_AUDIO">Group Audio</option><option value="PARTY">Party</option></AdminSelect></AdminField>
            <AdminField label="Display Order"><AdminInput type="number" value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} /></AdminField>
          </div>
          <AdminField label="Activation"><AdminSelect value={form.isActive ? "ACTIVE" : "INACTIVE"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "ACTIVE" }))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></AdminSelect></AdminField>
          <div className="flex justify-end gap-2 pt-2">
            <AdminButton variant="secondary" onClick={() => setShowGiftModal(false)}>Cancel</AdminButton>
            <AdminButton onClick={saveGift} disabled={createGift.isPending || updateGift.isPending || giftUpload.isPending}>{createGift.isPending || updateGift.isPending ? "Saving..." : "Save Gift"}</AdminButton>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
