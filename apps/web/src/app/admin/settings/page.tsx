"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import {
  AdminButton,
  AdminDataTable,
  AdminField,
  AdminInput,
  AdminMetricCard,
  AdminModal,
  AdminPageHeader,
  AdminPanelCard,
  AdminSelect,
  AdminStatusPill,
  AdminTabs,
} from "@/features/admin/components/admin-ui";
import { Activity, Flag, Gauge, ScrollText } from "lucide-react";

type SettingRow = {
  id: string;
  namespace: string;
  key: string;
  valueJson: unknown;
  environment: string;
  version: number;
  status: string;
};

type FlagRow = {
  id: string;
  featureName: string;
  flagKey: string;
  flagType: "BOOLEAN" | "PERCENTAGE" | "USER_LIST" | "REGION";
  enabled: boolean;
  platform: "ALL" | "MOBILE" | "WEB" | "ANDROID" | "IOS";
  appVersion?: string | null;
  description?: string | null;
  percentageValue?: number | null;
  userIdsJson?: string[] | null;
  regionCodesJson?: string[] | null;
};

type AuditLogRow = {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string | Date;
};

type FeatureFlagForm = {
  key: string;
  featureName: string;
  description: string;
  type: FlagRow["flagType"];
  isEnabled: boolean;
  platform: FlagRow["platform"];
  appVersion: string;
  percentageValue: string;
  userIds: string;
  regionCodes: string;
};

const featureOptions = [
  { key: "live_streaming", label: "live streaming" },
  { key: "audio_calls", label: "audio calls" },
  { key: "video_calls", label: "video calls" },
  { key: "pk_battles", label: "PK battles" },
  { key: "gift_sending", label: "gift sending" },
  { key: "chat", label: "chat" },
  { key: "referral_system", label: "referral system" },
  { key: "agency_system", label: "agency system" },
  { key: "leaderboards", label: "leaderboards" },
];

const defaultFeatureFlagForm: FeatureFlagForm = {
  key: "live_streaming",
  featureName: "live streaming",
  description: "Enable or disable live streaming access",
  type: "BOOLEAN",
  isEnabled: true,
  platform: "MOBILE",
  appVersion: "",
  percentageValue: "50",
  userIds: "",
  regionCodes: "",
};

function parseListInput(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function prettyValue(value: unknown) {
  const json = JSON.stringify(value);
  if (!json) return "-";
  return json.length > 120 ? `${json.slice(0, 117)}...` : json;
}

function summariseAuditReason(reason: string) {
  try {
    const parsed = JSON.parse(reason) as Record<string, unknown>;
    const summaryEntries = Object.entries(parsed)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${typeof value === "object" ? prettyValue(value) : String(value)}`);
    return summaryEntries.length > 0 ? summaryEntries.join(" • ") : reason;
  } catch {
    return reason;
  }
}

type SettingsTableColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

function SettingsTextInput({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <AdminField label={label} hint={hint}>
      <AdminInput {...props} />
    </AdminField>
  );
}

function SettingsSelect({
  label,
  hint,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
}) {
  return (
    <AdminField label={label} hint={hint}>
      <AdminSelect {...props}>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </AdminSelect>
    </AdminField>
  );
}

function SettingsTable({
  columns,
  data,
  emptyMessage,
}: {
  columns: SettingsTableColumn[];
  data: Record<string, unknown>[];
  emptyMessage: string;
}) {
  return (
    <AdminDataTable<Record<string, unknown>>
      rows={data}
      rowKey={(row) => String(row.id ?? row.key ?? Math.random())}
      emptyMessage={emptyMessage}
      columns={columns.map((column) => ({
        key: column.key,
        label: column.label,
        render: (row) =>
          column.render
            ? column.render(row)
            : <span className="text-sm text-slate-700">{String(row[column.key] ?? "-")}</span>,
      }))}
    />
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [showFeatureFlag, setShowFeatureFlag] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showEconomyModal, setShowEconomyModal] = useState(false);
  const [showLevelsModal, setShowLevelsModal] = useState(false);
  const [showPkModal, setShowPkModal] = useState(false);
  const [showUserXpModal, setShowUserXpModal] = useState(false);
  const [auditCursor, setAuditCursor] = useState<string | undefined>(undefined);
  const [auditPage, setAuditPage] = useState(0);
  const [auditCursorStack, setAuditCursorStack] = useState<Array<string | undefined>>([undefined]);
  const [cachePattern, setCachePattern] = useState("settings:*");
  const [featureFlagForm, setFeatureFlagForm] = useState<FeatureFlagForm>(defaultFeatureFlagForm);
  const [pricingForm, setPricingForm] = useState({ audioCoinsPerMin: "30", videoCoinsPerMin: "50", maxCoinsPerMin: "100", minimumBalanceCoins: "100", lowBalanceWarningMultiplier: "2", modelLevelMultiplierEnabled: true });
  const [commissionForm, setCommissionForm] = useState({ platformCommissionPercent: "65", callCommissionPercent: "65", giftHostSharePercent: "35", agencySharePercent: "10", referralRewardPercent: "5" });
  const [economyForm, setEconomyForm] = useState({ coinsPerUsd: "100", coinsToDiamondsCoins: "100", coinsToDiamondsDiamonds: "100", diamondValueUsdPer100: "0.25", minWithdrawalUsd: "50", maxWithdrawalUsd: "1000" });
  const [levelsForm, setLevelsForm] = useState({ xpPerCallMinute: "10", xpPerDiamond: "1", levelBasedPayoutEnabled: true });
  const [pkForm, setPkForm] = useState({ enabled: true, battleDurationSeconds: "300", votingDurationSeconds: "30", minHostLevel: "1", maxConcurrentPerHost: "1", selfGiftBlocked: true, scoreMultiplierPercent: "100", rewardEnabled: true, winnerRewardCoins: "500", loserRewardCoins: "150", drawRewardCoins: "250" });
  const [xpForm, setXpForm] = useState({ watchSecondsPerInterval: "60", watchXpPerInterval: "2", watchMinSeconds: "60", streamSecondsPerInterval: "60", streamXpPerInterval: "4", streamMinSeconds: "60", giftCoinsPerInterval: "10", giftXpPerInterval: "1" });

  const settings = trpc.admin.getSystemSettings.useQuery(undefined, { retry: false });
  const featureFlags = trpc.admin.listFeatureFlags.useQuery(undefined, { retry: false });
  const auditLog = trpc.admin.getAuditLog.useQuery({ cursor: auditCursor, limit: 25 }, { retry: false, enabled: tab === "audit" });
  const upsertFeatureFlag = trpc.admin.upsertFeatureFlag.useMutation({
    onSuccess: () => {
      void featureFlags.refetch();
      setShowFeatureFlag(false);
      setFeatureFlagForm(defaultFeatureFlagForm);
    },
  });
  const upsertSetting = trpc.admin.upsertSystemSetting.useMutation({
    onSuccess: () => {
      void settings.refetch();
    },
  });
  const clearCache = trpc.admin.clearCache.useMutation({
    onSuccess: async () => {
      await settings.refetch();
      await featureFlags.refetch();
      await auditLog.refetch();
    },
  });

  const settingRows = (settings.data ?? []) as SettingRow[];
  const flagRows = (featureFlags.data ?? []) as FlagRow[];
  const auditRows = ((auditLog.data?.items ?? []) as AuditLogRow[]);

  function getSettingValue<T>(namespace: string, key: string, fallback: T): T {
    const row = settingRows.find((setting) => setting.namespace === namespace && setting.key === key);
    return (row?.valueJson as T | undefined) ?? fallback;
  }

  const callPricing = useMemo(() => getSettingValue("pricing.call", "rules", { audioCoinsPerMin: 30, videoCoinsPerMin: 50, maxCoinsPerMin: 100, minimumBalanceCoins: 100, lowBalanceWarningMultiplier: 2, modelLevelMultiplierEnabled: true }), [settingRows]);
  const commission = useMemo(() => getSettingValue("commission", "revenue_share", { platformCommissionPercent: 65, callCommissionPercent: 65, giftHostSharePercent: 35, agencySharePercent: 10, referralRewardPercent: 5 }), [settingRows]);
  const economy = useMemo(() => getSettingValue("economy", "conversion_profile", { coinsPerUsd: 100, coinsToDiamonds: { coins: 100, diamonds: 100 }, diamondValueUsdPer100: 0.25 }), [settingRows]);
  const withdrawalPolicy = useMemo(() => getSettingValue("economy", "withdrawal_policy", { minWithdrawalUsd: 50, maxWithdrawalUsd: 1000 }), [settingRows]);
  const modelLevels = useMemo(() => getSettingValue("levels.model", "progression", { xpPerCallMinute: 10, xpPerDiamond: 1, levelBasedPayoutEnabled: true }), [settingRows]);
  const pkBattleRules = useMemo(() => getSettingValue("pk", "battle_rules", { enabled: true, battleDurationSeconds: 300, votingDurationSeconds: 30, minHostLevel: 1, maxConcurrentPerHost: 1, selfGiftBlocked: true, scoreMultiplierPercent: 100 }), [settingRows]);
  const pkRewardSystem = useMemo(() => getSettingValue("pk", "reward_system", { enabled: true, winnerRewardCoins: 500, loserRewardCoins: 150, drawRewardCoins: 250 }), [settingRows]);
  const userXpRules = useMemo(() => getSettingValue("levels", "xp_rules", { watchSecondsPerInterval: 60, watchXpPerInterval: 2, watchMinSeconds: 60, streamSecondsPerInterval: 60, streamXpPerInterval: 4, streamMinSeconds: 60, giftCoinsPerInterval: 10, giftXpPerInterval: 1 }), [settingRows]);
  const creatorCoinPrice = useMemo(() => Number((1 / Math.max(1, Number(economy.coinsPerUsd ?? 100))).toFixed(4)), [economy.coinsPerUsd]);
  const enabledFlags = flagRows.filter((row) => row.enabled).length;

  function openPricingModal() {
    setPricingForm({ audioCoinsPerMin: String(callPricing.audioCoinsPerMin), videoCoinsPerMin: String(callPricing.videoCoinsPerMin), maxCoinsPerMin: String(callPricing.maxCoinsPerMin), minimumBalanceCoins: String(callPricing.minimumBalanceCoins), lowBalanceWarningMultiplier: String(callPricing.lowBalanceWarningMultiplier), modelLevelMultiplierEnabled: Boolean(callPricing.modelLevelMultiplierEnabled) });
    setShowPricingModal(true);
  }

  function openCommissionModal() {
    setCommissionForm({ platformCommissionPercent: String(commission.platformCommissionPercent), callCommissionPercent: String(commission.callCommissionPercent), giftHostSharePercent: String(commission.giftHostSharePercent), agencySharePercent: String(commission.agencySharePercent), referralRewardPercent: String(commission.referralRewardPercent) });
    setShowCommissionModal(true);
  }

  function openEconomyModal() {
    setEconomyForm({ coinsPerUsd: String(economy.coinsPerUsd), coinsToDiamondsCoins: String(economy.coinsToDiamonds.coins), coinsToDiamondsDiamonds: String(economy.coinsToDiamonds.diamonds), diamondValueUsdPer100: String(economy.diamondValueUsdPer100), minWithdrawalUsd: String(withdrawalPolicy.minWithdrawalUsd), maxWithdrawalUsd: String(withdrawalPolicy.maxWithdrawalUsd ?? 1000) });
    setShowEconomyModal(true);
  }

  function openLevelsModal() {
    setLevelsForm({ xpPerCallMinute: String(modelLevels.xpPerCallMinute), xpPerDiamond: String(modelLevels.xpPerDiamond), levelBasedPayoutEnabled: Boolean(modelLevels.levelBasedPayoutEnabled) });
    setShowLevelsModal(true);
  }

  function openPkModal() {
    setPkForm({ enabled: Boolean(pkBattleRules.enabled), battleDurationSeconds: String(pkBattleRules.battleDurationSeconds), votingDurationSeconds: String(pkBattleRules.votingDurationSeconds), minHostLevel: String(pkBattleRules.minHostLevel), maxConcurrentPerHost: String(pkBattleRules.maxConcurrentPerHost), selfGiftBlocked: Boolean(pkBattleRules.selfGiftBlocked), scoreMultiplierPercent: String(pkBattleRules.scoreMultiplierPercent), rewardEnabled: Boolean(pkRewardSystem.enabled), winnerRewardCoins: String(pkRewardSystem.winnerRewardCoins), loserRewardCoins: String(pkRewardSystem.loserRewardCoins), drawRewardCoins: String(pkRewardSystem.drawRewardCoins) });
    setShowPkModal(true);
  }

  function openUserXpModal() {
    setXpForm({ watchSecondsPerInterval: String(userXpRules.watchSecondsPerInterval), watchXpPerInterval: String(userXpRules.watchXpPerInterval), watchMinSeconds: String(userXpRules.watchMinSeconds), streamSecondsPerInterval: String(userXpRules.streamSecondsPerInterval), streamXpPerInterval: String(userXpRules.streamXpPerInterval), streamMinSeconds: String(userXpRules.streamMinSeconds), giftCoinsPerInterval: String(userXpRules.giftCoinsPerInterval), giftXpPerInterval: String(userXpRules.giftXpPerInterval) });
    setShowUserXpModal(true);
  }

  function openFeatureFlagModal(row?: FlagRow) {
    if (!row) {
      setFeatureFlagForm(defaultFeatureFlagForm);
      setShowFeatureFlag(true);
      return;
    }
    setFeatureFlagForm({ key: row.flagKey, featureName: row.featureName, description: row.description ?? "", type: row.flagType, isEnabled: Boolean(row.enabled), platform: row.platform, appVersion: row.appVersion ?? "", percentageValue: String(row.percentageValue ?? 50), userIds: (row.userIdsJson ?? []).join(", "), regionCodes: (row.regionCodesJson ?? []).join(", ") });
    setShowFeatureFlag(true);
  }

  function openSettingEditor(row: SettingRow) {
    if (row.namespace === "pricing.call" && row.key === "rules") return openPricingModal();
    if (row.namespace === "commission" && row.key === "revenue_share") return openCommissionModal();
    if (row.namespace === "economy" && (row.key === "conversion_profile" || row.key === "withdrawal_policy")) return openEconomyModal();
    if (row.namespace === "levels.model" && row.key === "progression") return openLevelsModal();
    if (row.namespace === "pk" && (row.key === "battle_rules" || row.key === "reward_system")) return openPkModal();
    if (row.namespace === "levels" && row.key === "xp_rules") return openUserXpModal();
  }

  async function saveEconomy() {
    await upsertSetting.mutateAsync({ namespace: "economy", key: "conversion_profile", value: { coinsPerUsd: Number(economyForm.coinsPerUsd), coinsToDiamonds: { coins: Number(economyForm.coinsToDiamondsCoins), diamonds: Number(economyForm.coinsToDiamondsDiamonds) }, diamondValueUsdPer100: Number(economyForm.diamondValueUsdPer100) }, status: "PUBLISHED", changeReason: "Updated economy conversion via admin UI" });
    await upsertSetting.mutateAsync({ namespace: "economy", key: "withdrawal_policy", value: { minWithdrawalUsd: Number(economyForm.minWithdrawalUsd), maxWithdrawalUsd: Number(economyForm.maxWithdrawalUsd) }, status: "PUBLISHED", changeReason: "Updated withdrawal policy via admin UI" });
    setShowEconomyModal(false);
  }

  async function savePk() {
    await upsertSetting.mutateAsync({ namespace: "pk", key: "battle_rules", value: { enabled: pkForm.enabled, battleDurationSeconds: Number(pkForm.battleDurationSeconds), votingDurationSeconds: Number(pkForm.votingDurationSeconds), minHostLevel: Number(pkForm.minHostLevel), maxConcurrentPerHost: Number(pkForm.maxConcurrentPerHost), selfGiftBlocked: pkForm.selfGiftBlocked, scoreMultiplierPercent: Number(pkForm.scoreMultiplierPercent) }, status: "PUBLISHED", changeReason: "Updated PK battle rules via admin UI" });
    await upsertSetting.mutateAsync({ namespace: "pk", key: "reward_system", value: { enabled: pkForm.rewardEnabled, winnerRewardCoins: Number(pkForm.winnerRewardCoins), loserRewardCoins: Number(pkForm.loserRewardCoins), drawRewardCoins: Number(pkForm.drawRewardCoins) }, status: "PUBLISHED", changeReason: "Updated PK reward system via admin UI" });
    setShowPkModal(false);
  }

  function goToNextAuditPage() {
    if (!auditLog.data?.nextCursor) return;
    setAuditCursorStack((current) => {
      const next = [...current];
      next[auditPage + 1] = auditLog.data?.nextCursor ?? undefined;
      return next;
    });
    setAuditPage((current) => current + 1);
    setAuditCursor(auditLog.data?.nextCursor ?? undefined);
  }

  function goToPreviousAuditPage() {
    if (auditPage === 0) return;
    const previousPage = auditPage - 1;
    setAuditPage(previousPage);
    setAuditCursor(auditCursorStack[previousPage]);
  }

  const knownSettings = settingRows.filter((row) => ["pricing.call:rules", "commission:revenue_share", "economy:conversion_profile", "economy:withdrawal_policy", "levels.model:progression", "pk:battle_rules", "pk:reward_system", "levels:xp_rules"].includes(`${row.namespace}:${row.key}`));

  return (
    <>
      <AdminPageHeader
        eyebrow="Platform Control"
        title="Settings"
        description="System configuration, feature rollout, pricing rules, and operational controls for the MissU Pro platform."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Published Settings" value={String(knownSettings.length)} icon={Gauge} />
        <AdminMetricCard label="Feature Flags" value={String(flagRows.length)} icon={Flag} tone="sky" />
        <AdminMetricCard label="Enabled Flags" value={String(enabledFlags)} icon={Activity} tone="emerald" />
        <AdminMetricCard label="Audit Events" value={String(auditRows.length)} icon={ScrollText} tone="amber" />
      </div>

      <AdminPanelCard title="Settings Surface" subtitle="Switch between configuration domains and operational controls.">
        <AdminTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "general", label: "General" },
            { value: "pricing", label: "Pricing Rules" },
            { value: "features", label: "Feature Flags" },
            { value: "cms", label: "CMS" },
            { value: "cache", label: "Cache" },
            { value: "audit", label: "Audit Log" },
          ]}
        />
      </AdminPanelCard>

      {tab === "general" ? (
        <AdminPanelCard title="General Settings" subtitle="Published config entries currently driving pricing, economy, PK, and level systems.">
          <SettingsTable
            emptyMessage="No system settings found."
            data={knownSettings as unknown as Record<string, unknown>[]}
            columns={[
              { key: "namespace", label: "Namespace" },
              { key: "key", label: "Key" },
              { key: "environment", label: "Environment" },
              { key: "version", label: "Version" },
              { key: "status", label: "Status", render: (row) => <AdminStatusPill value={String(row.status)} /> },
              { key: "valueJson", label: "Value", render: (row) => <span className="text-xs text-slate-500">{prettyValue(row.valueJson)}</span> },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <AdminButton variant="ghost" onClick={() => openSettingEditor(row as unknown as SettingRow)}>
                    Edit
                  </AdminButton>
                ),
              },
            ]}
          />
        </AdminPanelCard>
      ) : null}

      {tab === "pricing" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AdminPanelCard title="Call Pricing Rules" subtitle="Live call monetization policy applied across creator sessions." actions={<AdminButton variant="secondary" onClick={openPricingModal}>Edit Pricing</AdminButton>}>
            <div className="space-y-2 text-sm text-slate-600"><p>Audio base rate: {callPricing.audioCoinsPerMin} coins/min</p><p>Video base rate: {callPricing.videoCoinsPerMin} coins/min</p><p>Level multiplier: {callPricing.modelLevelMultiplierEnabled ? "enabled" : "disabled"}</p><p>Price cap: {callPricing.maxCoinsPerMin} coins/min</p><p>Minimum balance: {callPricing.minimumBalanceCoins} coins</p></div>
          </AdminPanelCard>
          <AdminPanelCard title="Model Level Rules" subtitle="XP inputs and payout modifiers for host progression." actions={<AdminButton variant="secondary" onClick={openLevelsModal}>Edit Levels</AdminButton>}>
            <div className="space-y-2 text-sm text-slate-600"><p>XP per call minute: {modelLevels.xpPerCallMinute}</p><p>XP per diamond: {modelLevels.xpPerDiamond}</p><p>Level-based payout: {modelLevels.levelBasedPayoutEnabled ? "enabled" : "disabled"}</p></div>
          </AdminPanelCard>
          <AdminPanelCard title="Commission Structure" subtitle="Revenue split rules for the platform, agencies, and referrals." actions={<AdminButton variant="secondary" onClick={openCommissionModal}>Edit Commission</AdminButton>}>
            <div className="space-y-2 text-sm text-slate-600"><p>Platform commission: {commission.platformCommissionPercent}%</p><p>Call commission: {commission.callCommissionPercent}%</p><p>Gift host share: {commission.giftHostSharePercent}%</p><p>Agency share: {commission.agencySharePercent}%</p><p>Referral reward: {commission.referralRewardPercent}%</p></div>
          </AdminPanelCard>
          <AdminPanelCard title="Economy Settings" subtitle="Conversion ratios, price anchors, and withdrawal thresholds." actions={<AdminButton variant="secondary" onClick={openEconomyModal}>Edit Economy</AdminButton>}>
            <div className="space-y-2 text-sm text-slate-600"><p>Coin price: ${creatorCoinPrice.toFixed(4)} per coin</p><p>Coins per USD: {economy.coinsPerUsd}</p><p>Gift conversion: {economy.coinsToDiamonds.coins} coins → {economy.coinsToDiamonds.diamonds} diamonds</p><p>Diamond payout: 100 diamonds = ${Number(economy.diamondValueUsdPer100).toFixed(2)}</p><p>Minimum withdrawal: ${Number(withdrawalPolicy.minWithdrawalUsd).toFixed(2)}</p><p>Maximum withdrawal: ${Number(withdrawalPolicy.maxWithdrawalUsd ?? 0).toFixed(2)}</p></div>
          </AdminPanelCard>
          <AdminPanelCard title="PK Battle Rules" subtitle="Battle timing, fairness controls, and reward policy." actions={<AdminButton variant="secondary" onClick={openPkModal}>Edit PK Rules</AdminButton>}>
            <div className="space-y-2 text-sm text-slate-600"><p>Battle duration: {pkBattleRules.battleDurationSeconds}s</p><p>Score multiplier: {pkBattleRules.scoreMultiplierPercent}%</p><p>Concurrent battles per host: {pkBattleRules.maxConcurrentPerHost}</p><p>Self gifting: {pkBattleRules.selfGiftBlocked ? "blocked" : "allowed"}</p><p>Rewards: winner {pkRewardSystem.winnerRewardCoins} / loser {pkRewardSystem.loserRewardCoins} / draw {pkRewardSystem.drawRewardCoins}</p></div>
          </AdminPanelCard>
          <AdminPanelCard title="User XP Rules" subtitle="Audience XP progression signals used across watch, stream, and gift events." actions={<div className="flex gap-2"><AdminButton variant="secondary" onClick={openUserXpModal}>Edit XP Rules</AdminButton><AdminButton variant="ghost" onClick={() => window.location.assign("/admin/levels")}>Manage Level Rewards</AdminButton></div>}>
            <div className="space-y-2 text-sm text-slate-600"><p>Watching live: {userXpRules.watchXpPerInterval} XP every {userXpRules.watchSecondsPerInterval}s</p><p>Minimum watch session: {userXpRules.watchMinSeconds}s</p><p>Streaming: {userXpRules.streamXpPerInterval} XP every {userXpRules.streamSecondsPerInterval}s</p><p>Minimum stream session: {userXpRules.streamMinSeconds}s</p><p>Gifting: {userXpRules.giftXpPerInterval} XP per {userXpRules.giftCoinsPerInterval} coins</p></div>
          </AdminPanelCard>
        </div>
      ) : null}

      {tab === "features" ? (
        <AdminPanelCard title="Feature Flags" subtitle="Gradual rollout control across web and mobile surfaces." actions={<AdminButton onClick={() => openFeatureFlagModal()}>Create Flag</AdminButton>}>
          <SettingsTable
            emptyMessage="No feature flags configured."
            data={flagRows as unknown as Record<string, unknown>[]}
            columns={[
              { key: "featureName", label: "Feature" },
              { key: "flagKey", label: "Key" },
              { key: "flagType", label: "Type" },
              { key: "platform", label: "Platform" },
              { key: "appVersion", label: "App Version", render: (row) => String(row.appVersion ?? "All") },
              { key: "enabled", label: "Status", render: (row) => <AdminStatusPill value={Boolean(row.enabled)} /> },
              { key: "description", label: "Description" },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <div className="flex gap-2">
                    <AdminButton
                      variant="ghost"
                      onClick={() => upsertFeatureFlag.mutate({ key: String(row.flagKey), featureName: String(row.featureName ?? row.flagKey), description: String(row.description ?? ""), type: row.flagType as FlagRow["flagType"], isEnabled: !Boolean(row.enabled), platform: row.platform as FlagRow["platform"], appVersion: row.appVersion as string | undefined, percentageValue: row.percentageValue as number | undefined, userIds: row.userIdsJson as string[] | undefined, regionCodes: row.regionCodesJson as string[] | undefined })}
                    >
                      Toggle
                    </AdminButton>
                    <AdminButton variant="ghost" onClick={() => openFeatureFlagModal(row as unknown as FlagRow)}>
                      Edit
                    </AdminButton>
                  </div>
                ),
              },
            ]}
          />
        </AdminPanelCard>
      ) : null}

      {tab === "cms" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AdminPanelCard title="Homepage Sections" subtitle="Manage homepage layout sections, ordering, and visibility." actions={<AdminButton variant="secondary" onClick={() => window.location.assign("/admin/homepage")}>Manage Sections</AdminButton>}><div className="text-sm text-slate-600">Editorial and merchandising slots for the public web experience.</div></AdminPanelCard>
          <AdminPanelCard title="Themes" subtitle="Manage theme inventory and presentation rules." actions={<AdminButton variant="secondary" onClick={() => window.location.assign("/admin/themes")}>Manage Themes</AdminButton>}><div className="text-sm text-slate-600">Control purchasable themes and their placement in party experiences.</div></AdminPanelCard>
          <AdminPanelCard title="Gift Catalog" subtitle="Adjust gift pricing, activation, and supported contexts." actions={<AdminButton variant="secondary" onClick={() => window.location.assign("/admin/gifts")}>Manage Gifts</AdminButton>}><div className="text-sm text-slate-600">Jump to the gift operations surface for inventory and monetization changes.</div></AdminPanelCard>
          <AdminPanelCard title="UI Layouts" subtitle="Configure dynamic component layouts and published screen variants." actions={<AdminButton variant="secondary" onClick={() => window.location.assign("/admin/ui-layouts")}>Manage Layouts</AdminButton>}><div className="text-sm text-slate-600">Server-driven screen layout management for web and mobile shells.</div></AdminPanelCard>
        </div>
      ) : null}

      {tab === "cache" ? (
        <AdminPanelCard title="Cache Management" subtitle="Targeted cache invalidation without shell access.">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Targeted keys can be purged from Redis without shell access. Use scoped patterns to avoid wiping unrelated live traffic.</p>
            <SettingsTextInput label="Redis key pattern" value={cachePattern} onChange={(event) => setCachePattern(event.target.value)} placeholder="settings:*" />
            <div className="flex flex-wrap gap-2">
              <AdminButton variant="secondary" onClick={() => setCachePattern("settings:*")}>Settings Keys</AdminButton>
              <AdminButton variant="secondary" onClick={() => setCachePattern("feature_flag:*")}>Feature Flags</AdminButton>
              <AdminButton variant="secondary" onClick={() => setCachePattern("ui_layout:*")}>UI Layouts</AdminButton>
              <AdminButton variant="danger" onClick={() => clearCache.mutate({ pattern: cachePattern.trim() || "*" })} disabled={clearCache.isPending || cachePattern.trim().length === 0}>Clear Matching Keys</AdminButton>
            </div>
            {clearCache.data ? <p className="text-sm text-slate-600">Removed {clearCache.data.deleted} cached key{clearCache.data.deleted === 1 ? "" : "s"}.</p> : null}
          </div>
        </AdminPanelCard>
      ) : null}
      {tab === "audit" ? (
        <>
          <AdminPanelCard title="Audit Log" subtitle="Immutable admin actions recorded by the backend.">
            <SettingsTable
              emptyMessage="No audit events recorded."
              data={auditRows as unknown as Record<string, unknown>[]}
              columns={[
                { key: "createdAt", label: "When", render: (row) => formatDate(String(row.createdAt)) },
                { key: "action", label: "Action" },
                { key: "targetType", label: "Target" },
                { key: "targetId", label: "Target ID", render: (row) => <span className="font-mono text-xs text-slate-600">{String(row.targetId)}</span> },
                { key: "reason", label: "Details", render: (row) => <span className="text-xs text-slate-500">{summariseAuditReason(String(row.reason))}</span> },
              ]}
            />
          </AdminPanelCard>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">Page {auditPage + 1} • {auditRows.length} event{auditRows.length === 1 ? "" : "s"}</p>
            <div className="flex gap-2">
              <AdminButton variant="secondary" onClick={goToPreviousAuditPage} disabled={auditPage === 0 || auditLog.isLoading}>Previous</AdminButton>
              <AdminButton variant="secondary" onClick={goToNextAuditPage} disabled={!auditLog.data?.nextCursor || auditLog.isLoading}>Next</AdminButton>
            </div>
          </div>
        </>
      ) : null}

      <AdminModal open={showFeatureFlag} onClose={() => setShowFeatureFlag(false)} title="Feature Flag" description="Create or update progressive delivery rules.">
        <div className="space-y-4">
          <SettingsSelect label="Feature" value={featureFlagForm.key} options={featureOptions.map((option) => ({ value: option.key, label: option.label }))} onChange={(event) => { const selected = featureOptions.find((option) => option.key === event.target.value); setFeatureFlagForm((current) => ({ ...current, key: event.target.value, featureName: selected?.label ?? event.target.value })); }} />
          <SettingsTextInput label="Feature Name" value={featureFlagForm.featureName} onChange={(event) => setFeatureFlagForm((current) => ({ ...current, featureName: event.target.value }))} />
          <SettingsTextInput label="Description" value={featureFlagForm.description} onChange={(event) => setFeatureFlagForm((current) => ({ ...current, description: event.target.value }))} />
          <SettingsSelect label="Type" value={featureFlagForm.type} onChange={(event) => setFeatureFlagForm((current) => ({ ...current, type: event.target.value as typeof current.type }))} options={[{ value: "BOOLEAN", label: "Boolean" }, { value: "PERCENTAGE", label: "Percentage" }, { value: "USER_LIST", label: "User List" }, { value: "REGION", label: "Region" }]} />
          <SettingsSelect label="Platform" value={featureFlagForm.platform} onChange={(event) => setFeatureFlagForm((current) => ({ ...current, platform: event.target.value as typeof current.platform }))} options={[{ value: "ALL", label: "All" }, { value: "MOBILE", label: "Mobile" }, { value: "WEB", label: "Web" }, { value: "ANDROID", label: "Android" }, { value: "IOS", label: "iOS" }]} />
          <SettingsTextInput label="App Version" value={featureFlagForm.appVersion} onChange={(event) => setFeatureFlagForm((current) => ({ ...current, appVersion: event.target.value }))} placeholder="Optional exact version" />
          <SettingsSelect label="Default State" value={featureFlagForm.isEnabled ? "enabled" : "disabled"} onChange={(event) => setFeatureFlagForm((current) => ({ ...current, isEnabled: event.target.value === "enabled" }))} options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]} />
          {featureFlagForm.type === "PERCENTAGE" ? <SettingsTextInput label="Percentage Value" type="number" value={featureFlagForm.percentageValue} onChange={(event) => setFeatureFlagForm((current) => ({ ...current, percentageValue: event.target.value }))} /> : null}
          {featureFlagForm.type === "USER_LIST" ? <SettingsTextInput label="User IDs" value={featureFlagForm.userIds} onChange={(event) => setFeatureFlagForm((current) => ({ ...current, userIds: event.target.value }))} placeholder="Comma-separated UUIDs" /> : null}
          {featureFlagForm.type === "REGION" ? <SettingsTextInput label="Region Codes" value={featureFlagForm.regionCodes} onChange={(event) => setFeatureFlagForm((current) => ({ ...current, regionCodes: event.target.value }))} placeholder="Comma-separated region codes" /> : null}
          <div className="flex gap-2 pt-2">
            <AdminButton onClick={() => upsertFeatureFlag.mutate({ key: featureFlagForm.key, featureName: featureFlagForm.featureName, description: featureFlagForm.description, type: featureFlagForm.type, isEnabled: featureFlagForm.isEnabled, platform: featureFlagForm.platform, appVersion: featureFlagForm.appVersion || undefined, percentageValue: featureFlagForm.type === "PERCENTAGE" ? Number(featureFlagForm.percentageValue) : undefined, userIds: featureFlagForm.type === "USER_LIST" ? parseListInput(featureFlagForm.userIds) : undefined, regionCodes: featureFlagForm.type === "REGION" ? parseListInput(featureFlagForm.regionCodes) : undefined })} disabled={upsertFeatureFlag.isPending}>Save</AdminButton>
            <AdminButton variant="secondary" onClick={() => setShowFeatureFlag(false)}>Cancel</AdminButton>
          </div>
        </div>
      </AdminModal>

      <AdminModal open={showPricingModal} onClose={() => setShowPricingModal(false)} title="Edit Call Pricing" description="Adjust the base rate policy used by creator calls.">
        <div className="space-y-4">
          <SettingsTextInput label="Audio coins per minute" type="number" value={pricingForm.audioCoinsPerMin} onChange={(event) => setPricingForm((current) => ({ ...current, audioCoinsPerMin: event.target.value }))} />
          <SettingsTextInput label="Video coins per minute" type="number" value={pricingForm.videoCoinsPerMin} onChange={(event) => setPricingForm((current) => ({ ...current, videoCoinsPerMin: event.target.value }))} />
          <SettingsTextInput label="Max coins per minute" type="number" value={pricingForm.maxCoinsPerMin} onChange={(event) => setPricingForm((current) => ({ ...current, maxCoinsPerMin: event.target.value }))} />
          <SettingsTextInput label="Minimum balance" type="number" value={pricingForm.minimumBalanceCoins} onChange={(event) => setPricingForm((current) => ({ ...current, minimumBalanceCoins: event.target.value }))} />
          <SettingsTextInput label="Low balance warning multiplier" type="number" value={pricingForm.lowBalanceWarningMultiplier} onChange={(event) => setPricingForm((current) => ({ ...current, lowBalanceWarningMultiplier: event.target.value }))} />
          <SettingsSelect label="Model level multiplier" value={pricingForm.modelLevelMultiplierEnabled ? "enabled" : "disabled"} onChange={(event) => setPricingForm((current) => ({ ...current, modelLevelMultiplierEnabled: event.target.value === "enabled" }))} options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]} />
          <div className="flex gap-2 pt-2"><AdminButton onClick={() => upsertSetting.mutate({ namespace: "pricing.call", key: "rules", value: { audioCoinsPerMin: Number(pricingForm.audioCoinsPerMin), videoCoinsPerMin: Number(pricingForm.videoCoinsPerMin), maxCoinsPerMin: Number(pricingForm.maxCoinsPerMin), minimumBalanceCoins: Number(pricingForm.minimumBalanceCoins), lowBalanceWarningMultiplier: Number(pricingForm.lowBalanceWarningMultiplier), modelLevelMultiplierEnabled: pricingForm.modelLevelMultiplierEnabled }, status: "PUBLISHED", changeReason: "Updated call pricing via admin UI" })} disabled={upsertSetting.isPending}>Save</AdminButton><AdminButton variant="secondary" onClick={() => setShowPricingModal(false)}>Cancel</AdminButton></div>
        </div>
      </AdminModal>

      <AdminModal open={showCommissionModal} onClose={() => setShowCommissionModal(false)} title="Edit Commission" description="Update how revenue is shared across platform, agencies, and referrals.">
        <div className="space-y-4">
          <SettingsTextInput label="Platform commission (%)" type="number" value={commissionForm.platformCommissionPercent} onChange={(event) => setCommissionForm((current) => ({ ...current, platformCommissionPercent: event.target.value }))} />
          <SettingsTextInput label="Call commission (%)" type="number" value={commissionForm.callCommissionPercent} onChange={(event) => setCommissionForm((current) => ({ ...current, callCommissionPercent: event.target.value }))} />
          <SettingsTextInput label="Gift host share (%)" type="number" value={commissionForm.giftHostSharePercent} onChange={(event) => setCommissionForm((current) => ({ ...current, giftHostSharePercent: event.target.value }))} />
          <SettingsTextInput label="Agency share (%)" type="number" value={commissionForm.agencySharePercent} onChange={(event) => setCommissionForm((current) => ({ ...current, agencySharePercent: event.target.value }))} />
          <SettingsTextInput label="Referral reward (%)" type="number" value={commissionForm.referralRewardPercent} onChange={(event) => setCommissionForm((current) => ({ ...current, referralRewardPercent: event.target.value }))} />
          <div className="flex gap-2 pt-2"><AdminButton onClick={() => upsertSetting.mutate({ namespace: "commission", key: "revenue_share", value: { platformCommissionPercent: Number(commissionForm.platformCommissionPercent), callCommissionPercent: Number(commissionForm.callCommissionPercent), giftHostSharePercent: Number(commissionForm.giftHostSharePercent), agencySharePercent: Number(commissionForm.agencySharePercent), referralRewardPercent: Number(commissionForm.referralRewardPercent) }, status: "PUBLISHED", changeReason: "Updated commission via admin UI" })} disabled={upsertSetting.isPending}>Save</AdminButton><AdminButton variant="secondary" onClick={() => setShowCommissionModal(false)}>Cancel</AdminButton></div>
        </div>
      </AdminModal>

      <AdminModal open={showEconomyModal} onClose={() => setShowEconomyModal(false)} title="Edit Economy" description="Manage conversion ratios and payout boundaries.">
        <div className="space-y-4">
          <SettingsTextInput label="Coins per USD" type="number" value={economyForm.coinsPerUsd} onChange={(event) => setEconomyForm((current) => ({ ...current, coinsPerUsd: event.target.value }))} />
          <div className="grid grid-cols-2 gap-3"><SettingsTextInput label="Gift conversion coins" type="number" value={economyForm.coinsToDiamondsCoins} onChange={(event) => setEconomyForm((current) => ({ ...current, coinsToDiamondsCoins: event.target.value }))} /><SettingsTextInput label="Gift conversion diamonds" type="number" value={economyForm.coinsToDiamondsDiamonds} onChange={(event) => setEconomyForm((current) => ({ ...current, coinsToDiamondsDiamonds: event.target.value }))} /></div>
          <SettingsTextInput label="Diamond payout (USD per 100 diamonds)" type="number" step="0.01" value={economyForm.diamondValueUsdPer100} onChange={(event) => setEconomyForm((current) => ({ ...current, diamondValueUsdPer100: event.target.value }))} />
          <SettingsTextInput label="Minimum withdrawal (USD)" type="number" step="0.01" value={economyForm.minWithdrawalUsd} onChange={(event) => setEconomyForm((current) => ({ ...current, minWithdrawalUsd: event.target.value }))} />
          <SettingsTextInput label="Maximum withdrawal (USD)" type="number" step="0.01" value={economyForm.maxWithdrawalUsd} onChange={(event) => setEconomyForm((current) => ({ ...current, maxWithdrawalUsd: event.target.value }))} />
          <div className="flex gap-2 pt-2"><AdminButton onClick={saveEconomy} disabled={upsertSetting.isPending}>Save</AdminButton><AdminButton variant="secondary" onClick={() => setShowEconomyModal(false)}>Cancel</AdminButton></div>
        </div>
      </AdminModal>

      <AdminModal open={showLevelsModal} onClose={() => setShowLevelsModal(false)} title="Edit Model Level Rules" description="Tune progression for creators and model payout behavior.">
        <div className="space-y-4">
          <SettingsTextInput label="XP per call minute" type="number" value={levelsForm.xpPerCallMinute} onChange={(event) => setLevelsForm((current) => ({ ...current, xpPerCallMinute: event.target.value }))} />
          <SettingsTextInput label="XP per diamond" type="number" value={levelsForm.xpPerDiamond} onChange={(event) => setLevelsForm((current) => ({ ...current, xpPerDiamond: event.target.value }))} />
          <SettingsSelect label="Level-based payout" value={levelsForm.levelBasedPayoutEnabled ? "enabled" : "disabled"} onChange={(event) => setLevelsForm((current) => ({ ...current, levelBasedPayoutEnabled: event.target.value === "enabled" }))} options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]} />
          <div className="flex gap-2 pt-2"><AdminButton onClick={() => upsertSetting.mutate({ namespace: "levels.model", key: "progression", value: { xpPerCallMinute: Number(levelsForm.xpPerCallMinute), xpPerDiamond: Number(levelsForm.xpPerDiamond), levelBasedPayoutEnabled: levelsForm.levelBasedPayoutEnabled }, status: "PUBLISHED", changeReason: "Updated model levels via admin UI" })} disabled={upsertSetting.isPending}>Save</AdminButton><AdminButton variant="secondary" onClick={() => setShowLevelsModal(false)}>Cancel</AdminButton></div>
        </div>
      </AdminModal>

      <AdminModal open={showPkModal} onClose={() => setShowPkModal(false)} title="Edit PK Battle Rules" description="Configure battle duration, fairness, and reward policy.">
        <div className="space-y-4">
          <SettingsSelect label="PK battles" value={pkForm.enabled ? "enabled" : "disabled"} onChange={(event) => setPkForm((current) => ({ ...current, enabled: event.target.value === "enabled" }))} options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]} />
          <SettingsTextInput label="Battle duration (seconds)" type="number" value={pkForm.battleDurationSeconds} onChange={(event) => setPkForm((current) => ({ ...current, battleDurationSeconds: event.target.value }))} />
          <SettingsTextInput label="Voting duration (seconds)" type="number" value={pkForm.votingDurationSeconds} onChange={(event) => setPkForm((current) => ({ ...current, votingDurationSeconds: event.target.value }))} />
          <SettingsTextInput label="Minimum host level" type="number" value={pkForm.minHostLevel} onChange={(event) => setPkForm((current) => ({ ...current, minHostLevel: event.target.value }))} />
          <SettingsTextInput label="Max concurrent battles per host" type="number" value={pkForm.maxConcurrentPerHost} onChange={(event) => setPkForm((current) => ({ ...current, maxConcurrentPerHost: event.target.value }))} />
          <SettingsTextInput label="Score multiplier (%)" type="number" value={pkForm.scoreMultiplierPercent} onChange={(event) => setPkForm((current) => ({ ...current, scoreMultiplierPercent: event.target.value }))} />
          <SettingsSelect label="Self gifting" value={pkForm.selfGiftBlocked ? "blocked" : "allowed"} onChange={(event) => setPkForm((current) => ({ ...current, selfGiftBlocked: event.target.value === "blocked" }))} options={[{ value: "blocked", label: "Blocked" }, { value: "allowed", label: "Allowed" }]} />
          <SettingsSelect label="Reward system" value={pkForm.rewardEnabled ? "enabled" : "disabled"} onChange={(event) => setPkForm((current) => ({ ...current, rewardEnabled: event.target.value === "enabled" }))} options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]} />
          <SettingsTextInput label="Winner reward (coins)" type="number" value={pkForm.winnerRewardCoins} onChange={(event) => setPkForm((current) => ({ ...current, winnerRewardCoins: event.target.value }))} />
          <SettingsTextInput label="Loser reward (coins)" type="number" value={pkForm.loserRewardCoins} onChange={(event) => setPkForm((current) => ({ ...current, loserRewardCoins: event.target.value }))} />
          <SettingsTextInput label="Draw reward (coins per host)" type="number" value={pkForm.drawRewardCoins} onChange={(event) => setPkForm((current) => ({ ...current, drawRewardCoins: event.target.value }))} />
          <div className="flex gap-2 pt-2"><AdminButton onClick={savePk} disabled={upsertSetting.isPending}>Save</AdminButton><AdminButton variant="secondary" onClick={() => setShowPkModal(false)}>Cancel</AdminButton></div>
        </div>
      </AdminModal>

      <AdminModal open={showUserXpModal} onClose={() => setShowUserXpModal(false)} title="Edit User XP Rules" description="Tune audience XP progression inputs across watch, stream, and gift loops.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><SettingsTextInput label="Watch interval (seconds)" type="number" value={xpForm.watchSecondsPerInterval} onChange={(event) => setXpForm((current) => ({ ...current, watchSecondsPerInterval: event.target.value }))} /><SettingsTextInput label="Watch XP per interval" type="number" value={xpForm.watchXpPerInterval} onChange={(event) => setXpForm((current) => ({ ...current, watchXpPerInterval: event.target.value }))} /></div>
          <SettingsTextInput label="Minimum watch session" type="number" value={xpForm.watchMinSeconds} onChange={(event) => setXpForm((current) => ({ ...current, watchMinSeconds: event.target.value }))} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><SettingsTextInput label="Stream interval (seconds)" type="number" value={xpForm.streamSecondsPerInterval} onChange={(event) => setXpForm((current) => ({ ...current, streamSecondsPerInterval: event.target.value }))} /><SettingsTextInput label="Stream XP per interval" type="number" value={xpForm.streamXpPerInterval} onChange={(event) => setXpForm((current) => ({ ...current, streamXpPerInterval: event.target.value }))} /></div>
          <SettingsTextInput label="Minimum stream session" type="number" value={xpForm.streamMinSeconds} onChange={(event) => setXpForm((current) => ({ ...current, streamMinSeconds: event.target.value }))} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><SettingsTextInput label="Gift coin interval" type="number" value={xpForm.giftCoinsPerInterval} onChange={(event) => setXpForm((current) => ({ ...current, giftCoinsPerInterval: event.target.value }))} /><SettingsTextInput label="Gift XP per interval" type="number" value={xpForm.giftXpPerInterval} onChange={(event) => setXpForm((current) => ({ ...current, giftXpPerInterval: event.target.value }))} /></div>
          <div className="flex gap-2 pt-2"><AdminButton onClick={() => upsertSetting.mutate({ namespace: "levels", key: "xp_rules", value: { watchSecondsPerInterval: Number(xpForm.watchSecondsPerInterval), watchXpPerInterval: Number(xpForm.watchXpPerInterval), watchMinSeconds: Number(xpForm.watchMinSeconds), streamSecondsPerInterval: Number(xpForm.streamSecondsPerInterval), streamXpPerInterval: Number(xpForm.streamXpPerInterval), streamMinSeconds: Number(xpForm.streamMinSeconds), giftCoinsPerInterval: Number(xpForm.giftCoinsPerInterval), giftXpPerInterval: Number(xpForm.giftXpPerInterval) }, status: "PUBLISHED", changeReason: "Updated user XP rules via admin UI" })} disabled={upsertSetting.isPending}>Save</AdminButton><AdminButton variant="secondary" onClick={() => setShowUserXpModal(false)}>Cancel</AdminButton></div>
        </div>
      </AdminModal>
    </>
  );
}
