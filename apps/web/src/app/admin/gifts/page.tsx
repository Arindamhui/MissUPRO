"use client";

import { useMemo, useState } from "react";
import { Diamond, Gift, Layers3, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, Input, KpiCard, Modal, PageHeader, Select, StatusBadge, Tabs } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

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
  const [tab, setTab] = useState("catalog");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [form, setForm] = useState<GiftFormState>(initialForm);

  const catalog = trpc.admin.listGifts.useQuery(undefined, { retry: false });
  const createGift = trpc.admin.createGift.useMutation({
    onSuccess: () => {
      setShowGiftModal(false);
      setForm(initialForm);
      void catalog.refetch();
    },
  });
  const updateGift = trpc.admin.updateGift.useMutation({
    onSuccess: () => {
      setShowGiftModal(false);
      setForm(initialForm);
      void catalog.refetch();
    },
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

  return (
    <>
      <PageHeader
        title="Gift Catalog"
        description="Manage gift pricing, effect tiers, activation state, and supported delivery contexts."
        actions={<Button onClick={openCreateModal}>Create Gift</Button>}
      />

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <KpiCard label="Catalog Items" value={formatNumber(metrics.catalogItems)} icon={Gift} />
        <KpiCard label="Active Gifts" value={formatNumber(metrics.activeItems)} icon={Layers3} />
        <KpiCard label="Avg Coin Price" value={formatNumber(metrics.averageCoinPrice)} icon={Sparkles} />
        <KpiCard label="Avg Diamond Credit" value={formatNumber(metrics.averageDiamondCredit)} icon={Diamond} />
      </div>

      <Tabs
        tabs={[
          { id: "catalog", label: "Catalog" },
          { id: "economics", label: "Economics" },
          { id: "coverage", label: "Context Coverage" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "catalog" ? (
        <DataTable
          columns={[
            { key: "name", label: "Gift" },
            { key: "giftCode", label: "Code" },
            { key: "coinPrice", label: "Coins", render: (row) => formatNumber(row.coinPrice) },
            { key: "diamondCredit", label: "Diamonds", render: (row) => formatNumber(row.diamondCredit) },
            { key: "effectTier", label: "Tier" },
            { key: "displayOrder", label: "Order", render: (row) => formatNumber(Number(row.displayOrder ?? 0)) },
            { key: "isActive", label: "Status", render: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} /> },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <Button size="sm" variant="ghost" onClick={() => openEditModal(row)}>
                  Edit
                </Button>
              ),
            },
          ]}
          data={giftRows}
        />
      ) : null}

      {tab === "economics" ? (
        <Card title="Catalog Economics">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground mb-1">Total Coin Price Sum</p>
              <p className="text-2xl font-semibold">{formatNumber(giftRows.reduce((sum, row) => sum + row.coinPrice, 0))}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground mb-1">Total Diamond Credit Sum</p>
              <p className="text-2xl font-semibold">{formatNumber(giftRows.reduce((sum, row) => sum + row.diamondCredit, 0))}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground mb-1">Premium Share</p>
              <p className="text-2xl font-semibold">
                {metrics.catalogItems ? `${Math.round((metrics.premiumItems / metrics.catalogItems) * 100)}%` : "0%"}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === "coverage" ? (
        <Card title="Context Coverage">
          <div className="space-y-3 text-sm">
            {giftRows.map((row) => (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{row.name}</p>
                  <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>
                <p className="text-muted-foreground mt-2">
                  {Array.isArray(row.supportedContextsJson) && row.supportedContextsJson.length > 0
                    ? row.supportedContextsJson.join(", ")
                    : "No contexts configured"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Modal open={showGiftModal} onClose={() => setShowGiftModal(false)} title={form.id ? "Edit Gift" : "Create Gift"}>
        <div className="space-y-4">
          <Input label="Gift Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Icon URL" value={form.iconUrl} onChange={(event) => setForm((current) => ({ ...current, iconUrl: event.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Coin Price" type="number" value={form.coinPrice} onChange={(event) => setForm((current) => ({ ...current, coinPrice: event.target.value }))} />
            <Input label="Diamond Credit" type="number" value={form.diamondCredit} onChange={(event) => setForm((current) => ({ ...current, diamondCredit: event.target.value }))} />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Category"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              options={[
                { value: "STANDARD", label: "Standard" },
                { value: "PREMIUM", label: "Premium" },
                { value: "EVENT", label: "Event" },
                { value: "SEASONAL", label: "Seasonal" },
              ]}
            />
            <Select
              label="Effect Tier"
              value={form.effectTier}
              onChange={(event) => setForm((current) => ({ ...current, effectTier: event.target.value }))}
              options={[
                { value: "STANDARD", label: "Standard" },
                { value: "PREMIUM", label: "Premium" },
                { value: "LEGENDARY", label: "Legendary" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Context Profile"
              value={form.context}
              onChange={(event) => setForm((current) => ({ ...current, context: event.target.value as GiftContextKey }))}
              options={[
                { value: "ALL", label: "All Contexts" },
                { value: "LIVE", label: "Live / PK" },
                { value: "CALL", label: "Calls / Chat" },
                { value: "GROUP_AUDIO", label: "Group Audio" },
                { value: "PARTY", label: "Party" },
              ]}
            />
            <Input label="Display Order" type="number" value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} />
          </div>
          <Select
            label="Activation"
            value={form.isActive ? "ACTIVE" : "INACTIVE"}
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "ACTIVE" }))}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
          <div className="flex gap-2 pt-2">
            <Button onClick={saveGift} disabled={createGift.isPending || updateGift.isPending}>Save Gift</Button>
            <Button variant="secondary" onClick={() => setShowGiftModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
