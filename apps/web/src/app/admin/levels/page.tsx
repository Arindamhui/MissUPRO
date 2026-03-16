"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Sparkles, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, Input, KpiCard, Modal, PageHeader, Select, StatusBadge } from "@/components/ui";

type LevelFormState = {
  levelNumber: string;
  levelName: string;
  levelTrack: string;
  thresholdValue: string;
  iconUrl: string;
  status: string;
};

type RewardFormState = {
  rewardType: string;
  rewardValue: string;
  rewardName: string;
  description: string;
  autoGrant: boolean;
  status: string;
};

const initialLevelForm: LevelFormState = {
  levelNumber: "1",
  levelName: "",
  levelTrack: "USER",
  thresholdValue: "0",
  iconUrl: "",
  status: "ACTIVE",
};

const initialRewardForm: RewardFormState = {
  rewardType: "BADGE",
  rewardValue: "",
  rewardName: "",
  description: "",
  autoGrant: false,
  status: "ACTIVE",
};

export default function AdminLevelsPage() {
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [showCreateLevel, setShowCreateLevel] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Record<string, any> | null>(null);
  const [editingReward, setEditingReward] = useState<Record<string, any> | null>(null);
  const [levelForm, setLevelForm] = useState<LevelFormState>(initialLevelForm);
  const [rewardForm, setRewardForm] = useState<RewardFormState>(initialRewardForm);

  const levelsQuery = trpc.cms.listLevels.useQuery(undefined, { retry: false });
  const rewardsQuery = trpc.cms.getLevelRewards.useQuery(
    { levelId: selectedLevelId ?? "00000000-0000-0000-0000-000000000000" },
    { retry: false, enabled: !!selectedLevelId },
  );
  const createLevel = trpc.cms.createLevel.useMutation({
    onSuccess: () => {
      setShowCreateLevel(false);
      setLevelForm(initialLevelForm);
      void levelsQuery.refetch();
    },
  });
  const updateLevel = trpc.cms.updateLevel.useMutation({
    onSuccess: () => {
      setEditingLevel(null);
      void levelsQuery.refetch();
    },
  });
  const addReward = trpc.cms.addLevelReward.useMutation({
    onSuccess: () => {
      setShowRewardModal(false);
      setRewardForm(initialRewardForm);
      void rewardsQuery.refetch();
    },
  });
  const updateReward = trpc.cms.updateLevelReward.useMutation({
    onSuccess: () => {
      setEditingReward(null);
      void rewardsQuery.refetch();
    },
  });

  const levelRows = ((levelsQuery.data ?? []) as Record<string, any>[]).filter((level) => String(level.levelTrack) === "USER");
  const rewardRows = (rewardsQuery.data ?? []) as Record<string, any>[];

  useEffect(() => {
    if (!selectedLevelId && levelRows.length > 0) {
      setSelectedLevelId(String(levelRows[0]?.id));
    }
  }, [levelRows, selectedLevelId]);

  const selectedLevel = useMemo(
    () => levelRows.find((level) => String(level.id) === String(selectedLevelId)) ?? null,
    [levelRows, selectedLevelId],
  );

  const unlockedBadgeCount = rewardRows.filter((reward) => String(reward.rewardType) === "BADGE").length;
  const visualEffectCount = rewardRows.filter((reward) => String(reward.rewardType) === "VISUAL_EFFECT").length;
  const rankingBenefitCount = rewardRows.filter((reward) => String(reward.rewardType) === "RANKING_BENEFIT").length;

  return (
    <>
      <PageHeader
        title="User Levels"
        description="Manage the USER level track, thresholds, and reward unlocks for badges, visual effects, and ranking benefits."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowCreateLevel(true)}>Add Level</Button>
            <Button onClick={() => setShowRewardModal(true)} disabled={!selectedLevelId}>Add Reward</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <KpiCard label="User Levels" value={levelRows.length} icon={TrendingUp} />
        <KpiCard label="Badge Rewards" value={unlockedBadgeCount} icon={Award} />
        <KpiCard label="Visual Effects" value={visualEffectCount} icon={Sparkles} />
        <KpiCard label="Ranking Benefits" value={rankingBenefitCount} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card title="User Level Track">
          <DataTable
            columns={[
              { key: "levelNumber", label: "Level" },
              { key: "levelName", label: "Name" },
              { key: "thresholdValue", label: "XP Threshold" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "ACTIVE")} /> },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLevelId(String(row.id))}>Open</Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingLevel(row);
                        setLevelForm({
                          levelNumber: String(row.levelNumber ?? "1"),
                          levelName: String(row.levelName ?? ""),
                          levelTrack: String(row.levelTrack ?? "USER"),
                          thresholdValue: String(row.thresholdValue ?? "0"),
                          iconUrl: String(row.iconUrl ?? ""),
                          status: String(row.status ?? "ACTIVE"),
                        });
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ),
              },
            ]}
            data={levelRows}
            onRowClick={(row) => setSelectedLevelId(String(row.id))}
          />
        </Card>

        <Card
          title={selectedLevel ? `Rewards for Level ${selectedLevel.levelNumber} · ${selectedLevel.levelName}` : "Level Rewards"}
          actions={selectedLevelId ? <Button size="sm" onClick={() => setShowRewardModal(true)}>Add Reward</Button> : undefined}
        >
          {selectedLevel ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <p><span className="font-medium">Threshold:</span> {selectedLevel.thresholdValue} XP</p>
                <p><span className="font-medium">Status:</span> {selectedLevel.status}</p>
              </div>
              <DataTable
                columns={[
                  { key: "rewardName", label: "Reward" },
                  { key: "rewardType", label: "Type" },
                  { key: "rewardValue", label: "Value" },
                  { key: "autoGrant", label: "Auto", render: (row) => String(row.autoGrant) === "true" || row.autoGrant ? "Yes" : "No" },
                  { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "ACTIVE")} /> },
                  {
                    key: "actions",
                    label: "",
                    render: (row) => (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingReward(row);
                          setRewardForm({
                            rewardType: String(row.rewardType ?? "BADGE"),
                            rewardValue: String(row.rewardValue ?? ""),
                            rewardName: String(row.rewardName ?? ""),
                            description: String(row.description ?? ""),
                            autoGrant: Boolean(row.autoGrant),
                            status: String(row.status ?? "ACTIVE"),
                          });
                        }}
                      >
                        Edit
                      </Button>
                    ),
                  },
                ]}
                data={rewardRows}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a user level to manage its rewards.</p>
          )}
        </Card>
      </div>

      <Modal open={showCreateLevel || !!editingLevel} onClose={() => { setShowCreateLevel(false); setEditingLevel(null); setLevelForm(initialLevelForm); }} title={editingLevel ? "Edit User Level" : "Create User Level"}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Level Number" type="number" value={levelForm.levelNumber} onChange={(event) => setLevelForm((current) => ({ ...current, levelNumber: event.target.value }))} />
            <Input label="Level Name" value={levelForm.levelName} onChange={(event) => setLevelForm((current) => ({ ...current, levelName: event.target.value }))} />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select label="Track" value={levelForm.levelTrack} onChange={(event) => setLevelForm((current) => ({ ...current, levelTrack: event.target.value }))} options={[{ value: "USER", label: "User" }]} />
            <Select label="Status" value={levelForm.status} onChange={(event) => setLevelForm((current) => ({ ...current, status: event.target.value }))} options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />
          </div>
          <Input label="XP Threshold" type="number" value={levelForm.thresholdValue} onChange={(event) => setLevelForm((current) => ({ ...current, thresholdValue: event.target.value }))} />
          <Input label="Icon URL" value={levelForm.iconUrl} onChange={(event) => setLevelForm((current) => ({ ...current, iconUrl: event.target.value }))} placeholder="https://cdn.example.com/levels/spark.png" />
          <div className="flex gap-2 pt-2">
            <Button
              disabled={createLevel.isPending || updateLevel.isPending}
              onClick={() => {
                if (editingLevel) {
                  updateLevel.mutate({
                    levelId: String(editingLevel.id),
                    data: {
                      levelNumber: Number(levelForm.levelNumber),
                      levelName: levelForm.levelName,
                      thresholdValue: Number(levelForm.thresholdValue),
                      iconUrl: levelForm.iconUrl || null,
                      status: levelForm.status,
                    },
                  });
                  return;
                }

                createLevel.mutate({
                  levelNumber: Number(levelForm.levelNumber),
                  levelName: levelForm.levelName,
                  levelTrack: levelForm.levelTrack,
                  thresholdValue: Number(levelForm.thresholdValue),
                  iconUrl: levelForm.iconUrl || undefined,
                });
              }}
            >
              Save Level
            </Button>
            <Button variant="secondary" onClick={() => { setShowCreateLevel(false); setEditingLevel(null); setLevelForm(initialLevelForm); }}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showRewardModal || !!editingReward} onClose={() => { setShowRewardModal(false); setEditingReward(null); setRewardForm(initialRewardForm); }} title={editingReward ? "Edit Reward" : "Add Reward"}>
        <div className="space-y-4">
          <Select
            label="Reward Type"
            value={rewardForm.rewardType}
            onChange={(event) => setRewardForm((current) => ({ ...current, rewardType: event.target.value }))}
            options={[
              { value: "BADGE", label: "Badge" },
              { value: "VISUAL_EFFECT", label: "Visual Effect" },
              { value: "RANKING_BENEFIT", label: "Ranking Benefit" },
            ]}
          />
          <Input label="Reward Name" value={rewardForm.rewardName} onChange={(event) => setRewardForm((current) => ({ ...current, rewardName: event.target.value }))} />
          <Input label="Reward Value" value={rewardForm.rewardValue} onChange={(event) => setRewardForm((current) => ({ ...current, rewardValue: event.target.value }))} placeholder="spark_starter or discovery_boost_2" />
          <Input label="Description" value={rewardForm.description} onChange={(event) => setRewardForm((current) => ({ ...current, description: event.target.value }))} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select label="Auto Grant" value={rewardForm.autoGrant ? "yes" : "no"} onChange={(event) => setRewardForm((current) => ({ ...current, autoGrant: event.target.value === "yes" }))} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
            <Select label="Status" value={rewardForm.status} onChange={(event) => setRewardForm((current) => ({ ...current, status: event.target.value }))} options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              disabled={addReward.isPending || updateReward.isPending || (!selectedLevelId && !editingReward)}
              onClick={() => {
                if (editingReward) {
                  updateReward.mutate({
                    rewardId: String(editingReward.id),
                    data: {
                      rewardType: rewardForm.rewardType,
                      rewardValue: rewardForm.rewardValue,
                      rewardName: rewardForm.rewardName,
                      description: rewardForm.description,
                      autoGrant: rewardForm.autoGrant,
                      status: rewardForm.status,
                    },
                  });
                  return;
                }

                addReward.mutate({
                  levelId: String(selectedLevelId),
                  rewardType: rewardForm.rewardType,
                  rewardValue: rewardForm.rewardValue,
                  rewardName: rewardForm.rewardName,
                  description: rewardForm.description,
                });
              }}
            >
              Save Reward
            </Button>
            <Button variant="secondary" onClick={() => { setShowRewardModal(false); setEditingReward(null); setRewardForm(initialRewardForm); }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}