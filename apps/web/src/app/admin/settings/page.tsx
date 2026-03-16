"use client";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, Card, Tabs, Button, Input, DataTable, Select, Modal } from "@/components/ui";

export default function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [showFeatureFlag, setShowFeatureFlag] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showEconomyModal, setShowEconomyModal] = useState(false);
  const [showLevelsModal, setShowLevelsModal] = useState(false);

  const settings = trpc.admin.getSystemSettings.useQuery(undefined, { retry: false });
  const featureFlags = trpc.admin.listFeatureFlags.useQuery(undefined, { retry: false });
  const upsertSetting = trpc.admin.upsertSystemSetting.useMutation({
    onSuccess: () => {
      void settings.refetch();
      setShowPricingModal(false);
      setShowCommissionModal(false);
      setShowEconomyModal(false);
      setShowLevelsModal(false);
    },
  });

  const settingRows = (settings.data ?? []) as Record<string, any>[];
  const flagRows = (featureFlags.data?.flags ?? []) as Record<string, unknown>[];

  function getSettingValue<T>(namespace: string, key: string, fallback: T): T {
    const row = settingRows.find((s) => s.namespace === namespace && s.key === key);
    return (row?.valueJson as T | undefined) ?? fallback;
  }

  const callPricing = useMemo(
    () =>
      getSettingValue<{
        audioCoinsPerMin: number;
        videoCoinsPerMin: number;
        maxCoinsPerMin: number;
        modelLevelMultiplierEnabled: boolean;
      }>("pricing.call", "rules", {
        audioCoinsPerMin: 30,
        videoCoinsPerMin: 50,
        maxCoinsPerMin: 100,
        modelLevelMultiplierEnabled: true,
      }),
    [settingRows],
  );

  const commission = useMemo(
    () =>
      getSettingValue<{
        giftHostSharePercent: number;
        agencySharePercent: number;
        referralRewardPercent: number;
      }>("commission", "revenue_share", {
        giftHostSharePercent: 35,
        agencySharePercent: 10,
        referralRewardPercent: 5,
      }),
    [settingRows],
  );

  const economy = useMemo(
    () =>
      getSettingValue<{
        coinsPerUsd: number;
        coinsToDiamonds: { coins: number; diamonds: number };
        diamondValueUsdPer100: number;
      }>("economy", "conversion_profile", {
        coinsPerUsd: 100,
        coinsToDiamonds: { coins: 100, diamonds: 100 },
        diamondValueUsdPer100: 0.25,
      }),
    [settingRows],
  );

  const withdrawalPolicy = useMemo(
    () =>
      getSettingValue<{ minWithdrawalUsd: number }>("economy", "withdrawal_policy", {
        minWithdrawalUsd: 50,
      }),
    [settingRows],
  );

  const modelLevels = useMemo(
    () =>
      getSettingValue<{
        xpPerCallMinute: number;
        xpPerDiamond: number;
        levelBasedPayoutEnabled: boolean;
      }>("levels.model", "progression", {
        xpPerCallMinute: 10,
        xpPerDiamond: 1,
        levelBasedPayoutEnabled: true,
      }),
    [settingRows],
  );

  return (
    <>
      <PageHeader title="Settings" description="System configuration, feature flags, and platform controls" />

      <Tabs
        tabs={[
          { id: "general", label: "General" },
          { id: "pricing", label: "Pricing Rules" },
          { id: "features", label: "Feature Flags" },
          { id: "cms", label: "CMS" },
          { id: "cache", label: "Cache" },
          { id: "audit", label: "Audit Log" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "general" && (
        <div className="space-y-4">
          <DataTable
            columns={[
              { key: "key", label: "Setting Key" },
              { key: "value", label: "Value" },
              { key: "category", label: "Category" },
              { key: "actions", label: "", render: () => (
                <Button variant="ghost" size="sm">Edit</Button>
              )},
            ]}
            data={settingRows}
          />
        </div>
      )}

      {tab === "pricing" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Call Pricing Rules">
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Audio base rate: {callPricing.audioCoinsPerMin} coins/min</p>
                <p className="text-muted-foreground">Video base rate: {callPricing.videoCoinsPerMin} coins/min</p>
                <p className="text-muted-foreground">
                  Model level multiplier: {callPricing.modelLevelMultiplierEnabled ? "enabled" : "disabled"}
                </p>
                <p className="text-muted-foreground">Price cap: {callPricing.maxCoinsPerMin} coins/min</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowPricingModal(true)}>
                Edit Pricing
              </Button>
            </div>
          </Card>
          <Card title="Model Level Rules">
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">XP per call minute: {modelLevels.xpPerCallMinute}</p>
                <p className="text-muted-foreground">XP per diamond: {modelLevels.xpPerDiamond}</p>
                <p className="text-muted-foreground">
                  Level-based payout: {modelLevels.levelBasedPayoutEnabled ? "enabled" : "disabled"}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowLevelsModal(true)}>
                Edit Levels
              </Button>
            </div>
          </Card>
          <Card title="Commission Structure">
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Gift host share: {commission.giftHostSharePercent}%</p>
                <p className="text-muted-foreground">Agency share: {commission.agencySharePercent}%</p>
                <p className="text-muted-foreground">Referral reward: {commission.referralRewardPercent}%</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowCommissionModal(true)}>
                Edit Commission
              </Button>
            </div>
          </Card>
          <Card title="Economy Settings">
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Coins per USD: {economy.coinsPerUsd}</p>
                <p className="text-muted-foreground">
                  Gift conversion: {economy.coinsToDiamonds.coins} coins → {economy.coinsToDiamonds.diamonds} diamonds
                </p>
                <p className="text-muted-foreground">
                  Diamond payout: 100 diamonds = ${economy.diamondValueUsdPer100.toFixed(2)}
                </p>
                <p className="text-muted-foreground">
                  Minimum withdrawal: ${withdrawalPolicy.minWithdrawalUsd.toFixed(2)}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowEconomyModal(true)}>
                Edit Economy
              </Button>
            </div>
          </Card>
        </div>
      )}

      {tab === "features" && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowFeatureFlag(true)}>Create Flag</Button>
          </div>
          <DataTable
            columns={[
              { key: "key", label: "Flag" },
              { key: "enabled", label: "Status", render: (r) => (
                <span className={`text-xs font-medium ${r.enabled ? "text-success" : "text-danger"}`}>
                  {r.enabled ? "Enabled" : "Disabled"}
                </span>
              )},
              { key: "description", label: "Description" },
              { key: "actions", label: "", render: () => (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">Toggle</Button>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              )},
            ]}
            data={flagRows}
          />
        </>
      )}

      {tab === "cms" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Homepage Sections">
            <p className="text-sm text-muted-foreground">Manage homepage layout sections, ordering, and visibility</p>
            <Button variant="secondary" size="sm" className="mt-3">Manage Sections</Button>
          </Card>
          <Card title="Banners">
            <p className="text-sm text-muted-foreground">Create and manage promotional banners</p>
            <Button variant="secondary" size="sm" className="mt-3">Manage Banners</Button>
          </Card>
          <Card title="Themes">
            <p className="text-sm text-muted-foreground">Manage party and profile themes</p>
            <Button variant="secondary" size="sm" className="mt-3">Manage Themes</Button>
          </Card>
          <Card title="UI Layouts">
            <p className="text-sm text-muted-foreground">Configure platform UI layouts</p>
            <Button variant="secondary" size="sm" className="mt-3">Manage Layouts</Button>
          </Card>
        </div>
      )}

      {tab === "cache" && (
        <Card title="Cache Management">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Clear platform caches to force-refresh configuration and data.</p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm">Clear All Caches</Button>
              <Button variant="secondary" size="sm">Clear Settings Cache</Button>
              <Button variant="secondary" size="sm">Clear User Cache</Button>
            </div>
          </div>
        </Card>
      )}

      {tab === "audit" && (
        <Card title="Audit Log">
          <p className="text-sm text-muted-foreground">All admin actions are recorded with admin ID, timestamp, action type, and reason.</p>
          <DataTable
            columns={[
              { key: "adminId", label: "Admin" },
              { key: "action", label: "Action" },
              { key: "target", label: "Target" },
              { key: "reason", label: "Reason" },
              { key: "timestamp", label: "Time" },
            ]}
            data={[]}
          />
        </Card>
      )}

      <Modal open={showFeatureFlag} onClose={() => setShowFeatureFlag(false)} title="Create Feature Flag">
        <div className="space-y-4">
          <Input label="Flag Key" placeholder="e.g. enable_party_rooms" />
          <Input label="Description" placeholder="What this flag controls" />
          <Select label="Default State" options={[
            { value: "enabled", label: "Enabled" },
            { value: "disabled", label: "Disabled" },
          ]} />
          <div className="flex gap-2 pt-2">
            <Button>Create</Button>
            <Button variant="secondary" onClick={() => setShowFeatureFlag(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showPricingModal} onClose={() => setShowPricingModal(false)} title="Edit Call Pricing">
        <div className="space-y-4">
          <Input
            label="Audio coins per minute"
            type="number"
            defaultValue={callPricing.audioCoinsPerMin}
            onChange={(event) => {
              callPricing.audioCoinsPerMin = Number(event.target.value || 0);
            }}
          />
          <Input
            label="Video coins per minute"
            type="number"
            defaultValue={callPricing.videoCoinsPerMin}
            onChange={(event) => {
              callPricing.videoCoinsPerMin = Number(event.target.value || 0);
            }}
          />
          <Input
            label="Max coins per minute"
            type="number"
            defaultValue={callPricing.maxCoinsPerMin}
            onChange={(event) => {
              callPricing.maxCoinsPerMin = Number(event.target.value || 0);
            }}
          />
          <Select
            label="Model level multiplier"
            value={callPricing.modelLevelMultiplierEnabled ? "enabled" : "disabled"}
            onChange={(event) => {
              callPricing.modelLevelMultiplierEnabled = event.target.value === "enabled";
            }}
            options={[
              { value: "enabled", label: "Enabled" },
              { value: "disabled", label: "Disabled" },
            ]}
          />
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() =>
                upsertSetting.mutate({
                  namespace: "pricing.call",
                  key: "rules",
                  value: callPricing,
                  status: "PUBLISHED",
                  changeReason: "Updated call pricing via admin UI",
                })
              }
              disabled={upsertSetting.isPending}
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setShowPricingModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCommissionModal} onClose={() => setShowCommissionModal(false)} title="Edit Commission">
        <div className="space-y-4">
          <Input
            label="Gift host share (%)"
            type="number"
            defaultValue={commission.giftHostSharePercent}
            onChange={(event) => {
              commission.giftHostSharePercent = Number(event.target.value || 0);
            }}
          />
          <Input
            label="Agency share (%)"
            type="number"
            defaultValue={commission.agencySharePercent}
            onChange={(event) => {
              commission.agencySharePercent = Number(event.target.value || 0);
            }}
          />
          <Input
            label="Referral reward (%)"
            type="number"
            defaultValue={commission.referralRewardPercent}
            onChange={(event) => {
              commission.referralRewardPercent = Number(event.target.value || 0);
            }}
          />
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() =>
                upsertSetting.mutate({
                  namespace: "commission",
                  key: "revenue_share",
                  value: commission,
                  status: "PUBLISHED",
                  changeReason: "Updated commission via admin UI",
                })
              }
              disabled={upsertSetting.isPending}
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setShowCommissionModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showEconomyModal} onClose={() => setShowEconomyModal(false)} title="Edit Economy">
        <div className="space-y-4">
          <Input
            label="Coins per USD"
            type="number"
            defaultValue={economy.coinsPerUsd}
            onChange={(event) => {
              economy.coinsPerUsd = Number(event.target.value || 0);
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Gift conversion coins"
              type="number"
              defaultValue={economy.coinsToDiamonds.coins}
              onChange={(event) => {
                economy.coinsToDiamonds.coins = Number(event.target.value || 0);
              }}
            />
            <Input
              label="Gift conversion diamonds"
              type="number"
              defaultValue={economy.coinsToDiamonds.diamonds}
              onChange={(event) => {
                economy.coinsToDiamonds.diamonds = Number(event.target.value || 0);
              }}
            />
          </div>
          <Input
            label="Diamond payout (USD per 100 diamonds)"
            type="number"
            step="0.01"
            defaultValue={economy.diamondValueUsdPer100}
            onChange={(event) => {
              economy.diamondValueUsdPer100 = Number(event.target.value || 0);
            }}
          />
          <Input
            label="Minimum withdrawal (USD)"
            type="number"
            step="0.01"
            defaultValue={withdrawalPolicy.minWithdrawalUsd}
            onChange={(event) => {
              withdrawalPolicy.minWithdrawalUsd = Number(event.target.value || 0);
            }}
          />
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => {
                upsertSetting.mutate({
                  namespace: "economy",
                  key: "conversion_profile",
                  value: economy,
                  status: "PUBLISHED",
                  changeReason: "Updated economy conversion via admin UI",
                });
                upsertSetting.mutate({
                  namespace: "economy",
                  key: "withdrawal_policy",
                  value: withdrawalPolicy,
                  status: "PUBLISHED",
                  changeReason: "Updated withdrawal policy via admin UI",
                });
              }}
              disabled={upsertSetting.isPending}
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setShowEconomyModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showLevelsModal} onClose={() => setShowLevelsModal(false)} title="Edit Model Level Rules">
        <div className="space-y-4">
          <Input
            label="XP per call minute"
            type="number"
            defaultValue={modelLevels.xpPerCallMinute}
            onChange={(event) => {
              modelLevels.xpPerCallMinute = Number(event.target.value || 0);
            }}
          />
          <Input
            label="XP per diamond"
            type="number"
            defaultValue={modelLevels.xpPerDiamond}
            onChange={(event) => {
              modelLevels.xpPerDiamond = Number(event.target.value || 0);
            }}
          />
          <Select
            label="Level-based payout"
            value={modelLevels.levelBasedPayoutEnabled ? "enabled" : "disabled"}
            onChange={(event) => {
              modelLevels.levelBasedPayoutEnabled = event.target.value === "enabled";
            }}
            options={[
              { value: "enabled", label: "Enabled" },
              { value: "disabled", label: "Disabled" },
            ]}
          />
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() =>
                upsertSetting.mutate({
                  namespace: "levels.model",
                  key: "progression",
                  value: modelLevels,
                  status: "PUBLISHED",
                  changeReason: "Updated model levels via admin UI",
                })
              }
              disabled={upsertSetting.isPending}
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setShowLevelsModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
