"use client";

import { useState } from "react";
import { CalendarCheck, Coins, Diamond, Gift, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatNumber } from "@/lib/utils";
import {
  AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard,
  AdminModal, AdminPageHeader, AdminPanelCard, AdminSelect,
} from "@/features/admin/components/admin-ui";
import { useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";

type RewardSetting = {
  id: string;
  namespace: string;
  key: string;
  valueJson: unknown;
  status: string;
  version: number;
};

export default function DailyCheckinPage() {
  const notify = useAdminNotifier();
  const config = trpc.admin.getDailyCheckinConfig.useQuery(undefined, { retry: false });
  const [showModal, setShowModal] = useState(false);
  const [day, setDay] = useState("1");
  const [rewardType, setRewardType] = useState("COINS");
  const [rewardValue, setRewardValue] = useState("10");

  const upsertMut = trpc.admin.upsertDailyCheckinReward.useMutation({
    onSuccess: async () => { notify.success("Daily reward saved"); setShowModal(false); await config.refetch(); },
    onError: (e: any) => notify.error("Failed", e.message),
  });

  const d = config.data as { settings?: RewardSetting[]; stats?: Record<string, number> } | undefined;
  const settings = (d?.settings ?? []) as RewardSetting[];
  const stats = d?.stats ?? { totalUsersWithStreak: 0, maxStreak: 0, avgStreak: 0 };

  const rewardRows = settings.map((s) => {
    const val = s.valueJson as Record<string, unknown> | null;
    return {
      id: s.id,
      day: Number(val?.day ?? 0),
      rewardType: String(val?.rewardType ?? ""),
      rewardValue: Number(val?.rewardValue ?? 0),
      version: s.version,
    };
  }).sort((a, b) => a.day - b.day);

  function openCreate() { setDay("1"); setRewardType("COINS"); setRewardValue("10"); setShowModal(true); }
  function openEdit(row: { day: number; rewardType: string; rewardValue: number }) {
    setDay(String(row.day));
    setRewardType(row.rewardType);
    setRewardValue(String(row.rewardValue));
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Engagement"
        title="Daily Check-In"
        description="Configure daily login rewards. Users earn rewards for consecutive day logins."
        actions={<AdminButton onClick={openCreate}>Add Reward</AdminButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Users With Streak" value={formatNumber(stats.totalUsersWithStreak ?? 0)} icon={CalendarCheck} />
        <AdminMetricCard label="Max Streak" value={`${stats.maxStreak} days`} icon={Trophy} tone="amber" />
        <AdminMetricCard label="Avg Streak" value={`${stats.avgStreak} days`} icon={Gift} tone="emerald" />
        <AdminMetricCard label="Reward Rules" value={formatNumber(rewardRows.length)} icon={Coins} tone="sky" />
      </div>

      <AdminPanelCard title="Daily Reward Schedule" subtitle="Rewards given for each consecutive-day login.">
        <AdminDataTable
          rows={rewardRows}
          rowKey={(r) => r.id}
          isLoading={config.isLoading}
          emptyMessage="No daily rewards configured. Add rewards to encourage daily logins."
          columns={[
            { key: "day", label: "Day", sortable: true, render: (r) => <span className="font-mono font-bold text-violet-600">Day {r.day}</span> },
            { key: "rewardType", label: "Reward Type", sortable: true, render: (r) => (
              <div className="flex items-center gap-2">
                {r.rewardType === "COINS" && <Coins className="h-4 w-4 text-amber-500" />}
                {r.rewardType === "DIAMONDS" && <Diamond className="h-4 w-4 text-sky-500" />}
                {r.rewardType === "VIP_DAYS" && <Trophy className="h-4 w-4 text-violet-500" />}
                <span>{r.rewardType}</span>
              </div>
            )},
            { key: "rewardValue", label: "Value", sortable: true, render: (r) => <span className="font-semibold">{formatNumber(r.rewardValue)}</span> },
            { key: "version", label: "Version", render: (r) => <span className="text-slate-500">v{r.version}</span> },
            { key: "actions", label: "", render: (r) => <AdminButton variant="ghost" onClick={() => openEdit(r)}>Edit</AdminButton> },
          ]}
        />
      </AdminPanelCard>

      <AdminPanelCard title="Reward Flow" subtitle="How daily check-in works.">
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">1</div>
            <p>User opens the app and claims daily reward</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">2</div>
            <p>System checks streak day count and grants configured reward</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">3</div>
            <p>If user misses a day, streak resets to Day 1</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">4</div>
            <p>After max day, cycle repeats from Day 1</p>
          </div>
        </div>
      </AdminPanelCard>

      <AdminModal open={showModal} onClose={() => setShowModal(false)} title="Configure Daily Reward">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Day Number">
            <AdminInput type="number" value={day} onChange={(e) => setDay(e.target.value)} placeholder="1" />
          </AdminField>
          <AdminField label="Reward Type">
            <AdminSelect value={rewardType} onChange={(e) => setRewardType(e.target.value)}>
              <option value="COINS">Coins</option>
              <option value="DIAMONDS">Diamonds</option>
              <option value="VIP_DAYS">VIP Days</option>
              <option value="BADGE">Badge</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Reward Value">
            <AdminInput type="number" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} placeholder="10" />
          </AdminField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => setShowModal(false)}>Cancel</AdminButton>
          <AdminButton
            onClick={() => upsertMut.mutate({ day: Number(day), rewardType: rewardType as "COINS" | "DIAMONDS" | "VIP_DAYS" | "BADGE", rewardValue: Number(rewardValue) })}
            disabled={upsertMut.isPending}
          >Save Reward</AdminButton>
        </div>
      </AdminModal>
    </div>
  );
}
