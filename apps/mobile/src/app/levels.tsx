import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { GlassPanel, WinterScreen } from "@/components/me-winter";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

export default function LevelsScreen() {
  const level = trpc.level.myLevel.useQuery(undefined, { retry: false });
  const badges = trpc.level.getUserBadges.useQuery(undefined, { retry: false });
  const current = level.data;
  const currentLevel = Number(current?.level ?? 1);
  const currentXp = Number(current?.xp ?? 0);
  const nextLevelXp = Number(current?.nextLevel?.requiredXp ?? Math.max(currentXp, 50_000));
  const progress = Math.max(0, Math.min(1, nextLevelXp > 0 ? currentXp / nextLevelXp : 0));

  const privilegeCards = useMemo(() => {
    const unlockedRewards = ((current?.unlockedRewards ?? []) as any[]).map((reward, index) => ({
      id: `reward-${index}`,
      title: String(reward.rewardName ?? reward.rewardType ?? "Reward"),
      level: currentLevel,
      unlocked: true,
      icon: reward.rewardType === "VIP_DAYS" ? "👑" : reward.rewardType === "BADGE" ? "🎖️" : "✨",
    }));

    const defaults = [
      { id: "gift", title: "Newbie Gift", level: 1, unlocked: currentLevel >= 1, icon: "🎁" },
      { id: "vip", title: "3 days VIP", level: 1, unlocked: currentLevel >= 1, icon: "👑" },
      { id: "party", title: "Party Room", level: 2, unlocked: currentLevel >= 2, icon: "🎉" },
      { id: "video", title: "Video streaming", level: 2, unlocked: currentLevel >= 2, icon: "📹" },
      { id: "poster", title: "Poster on home", level: 7, unlocked: currentLevel >= 7, icon: "🖼️" },
      { id: "effect1", title: "1st Entrance effect", level: 7, unlocked: currentLevel >= 7, icon: "✨" },
      { id: "bronze", title: "Bronze Badge", level: 10, unlocked: currentLevel >= 10, icon: "🥉" },
      { id: "effect2", title: "2nd Entrance effect", level: 15, unlocked: currentLevel >= 15, icon: "🌟" },
      { id: "care", title: "Elite customer care", level: 15, unlocked: currentLevel >= 15, icon: "🎧" },
      { id: "effect3", title: "3rd Entrance effect", level: 20, unlocked: currentLevel >= 20, icon: "💫" },
      { id: "frame", title: "Bronze Profile Frame", level: 20, unlocked: currentLevel >= 20, icon: "🖼️" },
      { id: "silver", title: "Silver Badge", level: 20, unlocked: currentLevel >= 20, icon: "🥈" },
    ];

    const merged = [...unlockedRewards, ...defaults.filter((item) => !unlockedRewards.some((reward) => reward.title === item.title))];
    return merged.slice(0, 12);
  }, [current?.unlockedRewards, currentLevel]);

  return (
    <WinterScreen title="SK Lite" rightLabel="Close" onRightPress={() => undefined}>
      <GlassPanel style={{ backgroundColor: "rgba(132,67,255,0.85)", paddingTop: 28, paddingBottom: 18, alignItems: "center" }}>
        <Text style={{ fontSize: 84 }}>⭐</Text>
        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700", marginTop: 6 }}>level</Text>
        <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "900", marginTop: 2 }}>{currentLevel}</Text>
        <Text style={{ color: COLORS.white, fontSize: 18, marginTop: 18 }}>{currentXp}/{nextLevelXp}</Text>

        <View style={{ width: "100%", flexDirection: "row", alignItems: "center", marginTop: 18 }}>
          <Text style={{ color: COLORS.white, fontSize: 14, marginRight: 10 }}>Lv {currentLevel}</Text>
          <View style={{ flex: 1, backgroundColor: "rgba(54,19,120,0.55)", borderRadius: 999, padding: 4 }}>
            <View style={{ width: `${progress * 100}%`, backgroundColor: "#6C2CE5", borderRadius: 999, paddingVertical: 7 }} />
          </View>
          <Text style={{ color: COLORS.white, fontSize: 14, marginLeft: 10 }}>Lv {Math.max(currentLevel + 1, Number(current?.nextLevel?.level ?? currentLevel + 1))}</Text>
        </View>
      </GlassPanel>

      <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, marginHorizontal: -18, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 30 }}>
        <Text style={{ color: "#34343C", fontSize: 20, fontWeight: "800", marginBottom: 18 }}>Level Privilege</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {privilegeCards.map((item) => (
            <View key={item.id} style={{ width: "31.5%", alignItems: "center", marginBottom: 24 }}>
              <View style={{ width: 74, height: 74, borderRadius: 22, backgroundColor: item.unlocked ? "#654CF5" : "#E4E0E8", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 34 }}>{item.icon}</Text>
              </View>
              <Text style={{ color: item.unlocked ? "#5A5664" : "#A6A0AB", fontSize: 14, textAlign: "center", marginTop: 10 }}>{item.title}</Text>
              <View style={{ minWidth: 74, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: item.unlocked ? "#6D51F2" : "#D8D4DB", marginTop: 8, alignItems: "center" }}>
                <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "700" }}>Lv {item.level}</Text>
              </View>
            </View>
          ))}
        </View>

        {badges.data?.length ? (
          <GlassPanel style={{ backgroundColor: "#F7F5FA", borderColor: "#ECE7F3", marginTop: 4 }}>
            <Text style={{ color: "#34343C", fontSize: 17, fontWeight: "800", marginBottom: 8 }}>Latest Badge</Text>
            <Text style={{ color: "#1D1D21", fontSize: 16, fontWeight: "700" }}>{String(badges.data[0]?.name ?? "Badge")}</Text>
            <Text style={{ color: "#79717D", marginTop: 6 }}>{String(badges.data[0]?.description ?? "Keep engaging to unlock more profile effects.")}</Text>
          </GlassPanel>
        ) : null}
      </View>
    </WinterScreen>
  );
}