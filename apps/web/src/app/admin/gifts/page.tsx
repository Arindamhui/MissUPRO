"use client";

import { useState } from "react";
import { Gift, TrendingUp, Diamond, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, Button, Card, KpiCard, Tabs, Modal, Input, Select, StatusBadge } from "@/components/ui";
import { formatNumber, formatCurrency } from "@/lib/utils";

type GiftFormState = {
  name: string;
  iconUrl: string;
  coinPrice: string;
  diamondCredit: string;
  category: string;
  effectTier: string;
  context: string;
};

const initialForm: GiftFormState = {
  name: "",
  iconUrl: "",
  coinPrice: "",
  diamondCredit: "",
  category: "STANDARD",
  effectTier: "STANDARD",
  context: "ALL",
};

const CONTEXT_MAP: Record<string, string[]> = {
  ALL: ["LIVE_STREAM", "VIDEO_CALL", "VOICE_CALL", "CHAT_CONVERSATION", "PK_BATTLE", "GROUP_AUDIO", "PARTY"],
  LIVE: ["LIVE_STREAM"],
  CALL: ["VIDEO_CALL", "VOICE_CALL"],
  PARTY: ["PARTY"],
  GROUP_AUDIO: ["GROUP_AUDIO"],
};

export default function GiftsPage() {
  const [tab, setTab] = useState("catalog");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<GiftFormState>(initialForm);

  const catalog = trpc.admin.listGifts.useQuery(undefined, { retry: false });
  const createGift = trpc.admin.createGift.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setForm(initialForm);
      void catalog.refetch();
    },
  });

  const giftRows = (catalog.data ?? []) as Record<string, unknown>[];
  const totalCatalogValue = giftRows.reduce((sum, row) => sum + Number(row.coinPrice ?? 0), 0);
  const totalDiamondValue = giftRows.reduce((sum, row) => sum + Number(row.diamondCredit ?? 0), 0);
  const activeGiftCount = giftRows.filter((row) => Boolean(row.isActive)).length;
  const premiumCount = giftRows.filter((row) => String(row.effectTier) !== "STANDARD").length;

  const handleCreate = () => {
    if (!form.name || !form.iconUrl || !form.coinPrice) {
      return;
    }

    createGift.mutate({
      name: form.name,
      iconUrl: form.iconUrl,
      coinPrice: Number(form.coinPrice),
      diamondCredit: Number(form.diamondCredit || 0),
      category: form.category,
      effectTier: form.effectTier as "STANDARD" | "PREMIUM" | "LEGENDARY",
      supportedContexts: CONTEXT_MAP[form.context] as ("LIVE_STREAM" | "VIDEO_CALL" | "VOICE_CALL" | "CHAT_CONVERSATION" | "PK_BATTLE" | "GROUP_AUDIO" | "PARTY")[],
    });
  };

  return (
    <>
      <PageHeader
        title="Gift Management"
        description="Manage gift catalog, economy values, and supported delivery contexts."
        actions={<Button onClick={() => setShowCreate(true)}>Create Gift</Button>}
      />

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <KpiCard label="Catalog Items" value={formatNumber(giftRows.length)} icon={Gift} />
        <KpiCard label="Active Gifts" value={formatNumber(activeGiftCount)} icon={TrendingUp} />
        <KpiCard label="Diamond Credit Total" value={formatNumber(totalDiamondValue)} icon={Diamond} />
        <KpiCard label="Premium Effects" value={formatNumber(premiumCount)} icon={Users} />
      </div>

      <Tabs
        tabs={[
          { id: "catalog", label: "Gift Catalog" },
          { id: "analytics", label: "Catalog Economics" },
          { id: "leaderboard", label: "Context Coverage" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "catalog" && (
        <DataTable
          columns={[
            { key: "id", label: "ID", render: (row) => String(row.id).slice(0, 8) },
            { key: "name", label: "Name" },
            { key: "coinPrice", label: "Price (Coins)" },
            { key: "diamondCredit", label: "Diamond Credit" },
            { key: "category", label: "Category" },
            { key: "effectTier", label: "Effect Tier" },
            { key: "isActive", label: "Status", render: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} /> },
            {
              key: "supportedContextsJson",
              label: "Contexts",
              render: (row) => Array.isArray(row.supportedContextsJson) ? row.supportedContextsJson.join(", ") : "-",
            },
          ]}
          data={giftRows}
        />
      )}

      {tab === "analytics" && (
        <Card title="Catalog Economics">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground mb-1">Average Coin Price</p>
              <p className="text-2xl font-semibold">
                {giftRows.length ? formatNumber(Math.round(totalCatalogValue / giftRows.length)) : 0}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground mb-1">Average Diamond Credit</p>
              <p className="text-2xl font-semibold">
                {giftRows.length ? formatNumber(Math.round(totalDiamondValue / giftRows.length)) : 0}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground mb-1">Configured Catalog Value</p>
              <p className="text-2xl font-semibold">{formatCurrency(totalCatalogValue)}</p>
            </div>
          </div>
        </Card>
      )}

      {tab === "leaderboard" && (
        <Card title="Gift Context Coverage">
          <div className="space-y-3 text-sm">
            {giftRows.map((row) => (
              <div key={String(row.id)} className="rounded-lg border p-3">
                <p className="font-medium">{String(row.name)}</p>
                <p className="text-muted-foreground">
                  {Array.isArray(row.supportedContextsJson) ? row.supportedContextsJson.join(", ") : "No contexts configured"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Gift">
        <div className="space-y-4">
          <Input
            label="Gift Name"
            placeholder="Rose Shower"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Icon URL"
            placeholder="https://cdn.example.com/gifts/rose.png"
            value={form.iconUrl}
            onChange={(event) => setForm((current) => ({ ...current, iconUrl: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Coin Price"
              type="number"
              placeholder="100"
              value={form.coinPrice}
              onChange={(event) => setForm((current) => ({ ...current, coinPrice: event.target.value }))}
            />
            <Input
              label="Diamond Credit"
              type="number"
              placeholder="75"
              value={form.diamondCredit}
              onChange={(event) => setForm((current) => ({ ...current, diamondCredit: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Category"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              options={[
                { value: "STANDARD", label: "Standard" },
                { value: "PREMIUM", label: "Premium" },
                { value: "SEASONAL", label: "Seasonal" },
                { value: "EVENT", label: "Event" },
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
          <Select
            label="Context"
            value={form.context}
            onChange={(event) => setForm((current) => ({ ...current, context: event.target.value }))}
            options={[
              { value: "ALL", label: "All Contexts" },
              { value: "LIVE", label: "Live Stream" },
              { value: "CALL", label: "Calls" },
              { value: "GROUP_AUDIO", label: "Group Audio" },
              { value: "PARTY", label: "Party Rooms" },
            ]}
          />
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} disabled={createGift.isPending}>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
