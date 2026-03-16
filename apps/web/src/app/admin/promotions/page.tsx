"use client";

import { useState } from "react";
import { Megaphone, Users, Target, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, KpiCard, Tabs, Modal, Input, Select } from "@/components/ui";
import { formatDate, formatCurrency, formatNumber } from "@/lib/utils";

type PromotionFormState = {
  name: string;
  description: string;
  promotionType: string;
  targetAudience: string;
  maxBudget: string;
  startDate: string;
  endDate: string;
  status: string;
  bannerImageUrl: string;
  targetRegion: string;
};

const initialForm: PromotionFormState = {
  name: "",
  description: "",
  promotionType: "COIN_BONUS",
  targetAudience: "ALL_USERS",
  maxBudget: "",
  startDate: "",
  endDate: "",
  status: "DRAFT",
  bannerImageUrl: "",
  targetRegion: "",
};

export default function PromotionsPage() {
  const [tab, setTab] = useState("ACTIVE");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<PromotionFormState>(initialForm);

  const promotions = trpc.cms.listPromotions.useQuery(undefined, { retry: false });
  const createPromotion = trpc.cms.createPromotion.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setForm(initialForm);
      void promotions.refetch();
    },
  });
  const updatePromotion = trpc.cms.updatePromotion.useMutation({
    onSuccess: () => {
      setSelectedPromotion(null);
      void promotions.refetch();
    },
  });

  const rows = (promotions.data ?? []) as Record<string, unknown>[];
  const filteredRows = tab === "ALL" ? rows : rows.filter((row) => String(row.status) === tab);

  const activeCount = rows.filter((row) => String(row.status) === "ACTIVE").length;
  const scheduledCount = rows.filter((row) => String(row.status) === "SCHEDULED").length;
  const totalBudget = rows.reduce((sum, row) => sum + Number(row.maxBudget ?? 0), 0);
  const budgetUsed = rows.reduce((sum, row) => sum + Number(row.budgetUsed ?? 0), 0);

  const handleCreate = () => {
    if (!form.name || !form.startDate || !form.endDate) {
      return;
    }

    createPromotion.mutate({
      name: form.name,
      description: form.description,
      promotionType: form.promotionType as "COIN_BONUS" | "SEASONAL_EVENT" | "REFERRAL_BOOST" | "FIRST_PURCHASE_BONUS" | "REACTIVATION_BONUS",
      targetAudience: form.targetAudience as "ALL_USERS" | "NEW_USERS" | "INACTIVE_USERS" | "VIP_USERS" | "REGION_SEGMENT",
      targetRegion: form.targetRegion || undefined,
      bannerImageUrl: form.bannerImageUrl || undefined,
      maxBudget: form.maxBudget ? Number(form.maxBudget) : undefined,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      status: form.status as "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED",
      rewardRulesJson: {
        rewardType: form.promotionType === "COIN_BONUS" ? "COINS" : "BADGE",
        amount: form.maxBudget ? Number(form.maxBudget) : 0,
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Promotions & Campaigns"
        description="Manage promotional campaigns, budgets, and audience targeting."
        actions={<Button onClick={() => setShowCreate(true)}>Create Promotion</Button>}
      />

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <KpiCard label="Active Promotions" value={formatNumber(activeCount)} icon={Megaphone} />
        <KpiCard label="Scheduled Promotions" value={formatNumber(scheduledCount)} icon={Users} />
        <KpiCard label="Budget Planned" value={formatCurrency(totalBudget)} icon={Target} />
        <KpiCard label="Budget Used" value={formatCurrency(budgetUsed)} icon={TrendingUp} />
      </div>

      <Tabs
        tabs={[
          { id: "ACTIVE", label: "Active" },
          { id: "SCHEDULED", label: "Scheduled" },
          { id: "PAUSED", label: "Paused" },
          { id: "ENDED", label: "Ended" },
          { id: "ALL", label: "All" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <DataTable
        columns={[
          { key: "id", label: "ID", render: (row) => String(row.id).slice(0, 8) },
          { key: "name", label: "Promotion" },
          { key: "promotionType", label: "Type" },
          { key: "targetAudience", label: "Audience" },
          { key: "maxBudget", label: "Budget", render: (row) => formatCurrency(Number(row.maxBudget ?? 0)) },
          { key: "budgetUsed", label: "Used", render: (row) => formatCurrency(Number(row.budgetUsed ?? 0)) },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "DRAFT")} /> },
          { key: "startDate", label: "Start", render: (row) => row.startDate ? formatDate(String(row.startDate)) : "-" },
          { key: "endDate", label: "End", render: (row) => row.endDate ? formatDate(String(row.endDate)) : "-" },
          {
            key: "actions",
            label: "",
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedPromotion(row)}>Review</Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updatePromotion.mutate({
                    promotionId: String(row.id),
                    data: {
                      status: row.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                    },
                  })}
                  disabled={updatePromotion.isPending}
                >
                  {row.status === "ACTIVE" ? "Pause" : "Activate"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => updatePromotion.mutate({
                    promotionId: String(row.id),
                    data: {
                      status: "ENDED",
                    },
                  })}
                  disabled={updatePromotion.isPending || row.status === "ENDED"}
                >
                  End
                </Button>
              </div>
            ),
          },
        ]}
        data={filteredRows}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Promotion">
        <div className="space-y-4">
          <Input
            label="Promotion Name"
            placeholder="Win-back bonus"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Description"
            placeholder="Reward inactive users with a comeback bonus."
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Type"
              value={form.promotionType}
              onChange={(event) => setForm((current) => ({ ...current, promotionType: event.target.value }))}
              options={[
                { value: "COIN_BONUS", label: "Coin Bonus" },
                { value: "SEASONAL_EVENT", label: "Seasonal Event" },
                { value: "REFERRAL_BOOST", label: "Referral Boost" },
                { value: "FIRST_PURCHASE_BONUS", label: "First Purchase" },
                { value: "REACTIVATION_BONUS", label: "Reactivation" },
              ]}
            />
            <Select
              label="Audience"
              value={form.targetAudience}
              onChange={(event) => setForm((current) => ({ ...current, targetAudience: event.target.value }))}
              options={[
                { value: "ALL_USERS", label: "All Users" },
                { value: "NEW_USERS", label: "New Users" },
                { value: "INACTIVE_USERS", label: "Inactive Users" },
                { value: "VIP_USERS", label: "VIP Users" },
                { value: "REGION_SEGMENT", label: "Region Segment" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Budget"
              type="number"
              placeholder="10000"
              value={form.maxBudget}
              onChange={(event) => setForm((current) => ({ ...current, maxBudget: event.target.value }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              options={[
                { value: "DRAFT", label: "Draft" },
                { value: "SCHEDULED", label: "Scheduled" },
                { value: "ACTIVE", label: "Active" },
                { value: "PAUSED", label: "Paused" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Start Date"
              type="datetime-local"
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
            />
            <Input
              label="End Date"
              type="datetime-local"
              value={form.endDate}
              onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Banner Image URL"
              placeholder="https://cdn.example.com/banner.png"
              value={form.bannerImageUrl}
              onChange={(event) => setForm((current) => ({ ...current, bannerImageUrl: event.target.value }))}
            />
            <Input
              label="Target Region"
              placeholder="IN"
              value={form.targetRegion}
              onChange={(event) => setForm((current) => ({ ...current, targetRegion: event.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} disabled={createPromotion.isPending}>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!selectedPromotion}
        onClose={() => setSelectedPromotion(null)}
        title={`Promotion: ${String(selectedPromotion?.name ?? "")}`}
      >
        {selectedPromotion && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Type:</span> {String(selectedPromotion.promotionType ?? "-")}</div>
              <div><span className="text-muted-foreground">Audience:</span> {String(selectedPromotion.targetAudience ?? "-")}</div>
              <div><span className="text-muted-foreground">Budget:</span> {formatCurrency(Number(selectedPromotion.maxBudget ?? 0))}</div>
              <div><span className="text-muted-foreground">Used:</span> {formatCurrency(Number(selectedPromotion.budgetUsed ?? 0))}</div>
              <div><span className="text-muted-foreground">Start:</span> {selectedPromotion.startDate ? formatDate(String(selectedPromotion.startDate)) : "-"}</div>
              <div><span className="text-muted-foreground">End:</span> {selectedPromotion.endDate ? formatDate(String(selectedPromotion.endDate)) : "-"}</div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Description</p>
              <p>{String(selectedPromotion.description ?? "No description provided.")}</p>
            </div>
            <div className="flex gap-2 pt-3 border-t">
              <Button
                onClick={() => updatePromotion.mutate({
                  promotionId: String(selectedPromotion.id),
                  data: { status: "ACTIVE" },
                })}
                disabled={updatePromotion.isPending}
              >
                Activate
              </Button>
              <Button
                variant="secondary"
                onClick={() => updatePromotion.mutate({
                  promotionId: String(selectedPromotion.id),
                  data: { status: "PAUSED" },
                })}
                disabled={updatePromotion.isPending}
              >
                Pause
              </Button>
              <Button
                variant="danger"
                onClick={() => updatePromotion.mutate({
                  promotionId: String(selectedPromotion.id),
                  data: { status: "ENDED" },
                })}
                disabled={updatePromotion.isPending}
              >
                End
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
