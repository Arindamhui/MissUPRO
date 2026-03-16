import React from "react";
import { Text, View } from "react-native";
import { Screen, Card, Badge, EmptyState } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING } from "@/theme";

export default function LevelsScreen() {
  const level = trpc.level.myLevel.useQuery(undefined, { retry: false });
  const badges = trpc.level.getUserBadges.useQuery(undefined, { retry: false });
  const levelCatalog = trpc.level.listAllLevels.useQuery(undefined, { retry: false });

  const current = level.data;
  const items = (levelCatalog.data ?? []) as any[];

  return (
    <Screen scroll>
      <Card style={{ backgroundColor: "#111827" }}>
        <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800" }}>
          Level {current?.level ?? 1}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: SPACING.xs, fontSize: 16 }}>
          {current?.levelName ?? "Spark"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: SPACING.md }}>
          XP from watching live, sending gifts, and streaming unlocks badges, profile effects, and ranking boosts.
        </Text>
        {current?.nextLevel ? (
          <View style={{ marginTop: SPACING.lg }}>
            <Text style={{ color: COLORS.white, fontWeight: "700" }}>
              Next: Level {current.nextLevel.level} · {current.nextLevel.levelName}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
              {current.xp ?? 0}/{current.nextLevel.requiredXp} XP · {current.nextLevel.remainingXp} XP to go
            </Text>
          </View>
        ) : (
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: SPACING.lg }}>
            Max level reached.
          </Text>
        )}
      </Card>

      <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: SPACING.sm }}>Unlocked Now</Text>
      {current?.unlockedRewards?.length ? (
        current.unlockedRewards.map((reward: any) => (
          <Card key={String(reward.id)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: SPACING.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 16 }}>{reward.rewardName}</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{reward.description}</Text>
              </View>
              <Badge text={String(reward.rewardType).replaceAll("_", " ")} color={COLORS.primary} />
            </View>
          </Card>
        ))
      ) : (
        <Card>
          <Text style={{ color: COLORS.textSecondary }}>Keep engaging to unlock your first rewards.</Text>
        </Card>
      )}

      <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: SPACING.sm }}>Badges</Text>
      {badges.data?.length ? (
        badges.data.map((badge: any) => (
          <Card key={String(badge.badgeId)}>
            <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 16 }}>{badge.name}</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{badge.description}</Text>
          </Card>
        ))
      ) : (
        <Card>
          <Text style={{ color: COLORS.textSecondary }}>No badges unlocked yet.</Text>
        </Card>
      )}

      <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: SPACING.sm }}>Level Roadmap</Text>
      {items.length ? (
        items.map((item) => {
          const unlocked = Number(current?.level ?? 1) >= Number(item.levelNumber ?? 0);
          return (
            <Card key={String(item.id)} style={{ opacity: unlocked ? 1 : 0.72 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: "700" }}>
                  Level {item.levelNumber} · {item.levelName}
                </Text>
                <Badge text={unlocked ? "Unlocked" : `${item.thresholdValue} XP`} color={unlocked ? COLORS.success : COLORS.borderDark} />
              </View>
              {item.rewards?.length ? (
                <View style={{ marginTop: SPACING.sm, gap: SPACING.xs }}>
                  {item.rewards.map((reward: any) => (
                    <Text key={String(reward.id)} style={{ color: COLORS.textSecondary }}>
                      {reward.rewardType}: {reward.rewardName}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })
      ) : (
        <EmptyState icon="🏆" title="Levels unavailable" subtitle="The level roadmap has not been loaded yet." />
      )}
    </Screen>
  );
}