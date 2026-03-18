import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { GlassPanel, HeaderTabs, WinterScreen } from "@/components/me-winter";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

function BadgeGridItem({ name }: { name: string }) {
  return (
    <View style={{ width: "31%", marginBottom: 20, alignItems: "center" }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 36 }}>🏅</Text>
      </View>
      <Text style={{ color: "rgba(255,255,255,0.86)", fontSize: 13, textAlign: "center", marginTop: 10 }}>{name}</Text>
    </View>
  );
}

export default function BadgesScreen() {
  const [tab, setTab] = useState("honor");
  const myLevel = trpc.level.myLevel.useQuery(undefined, { retry: false });
  const allBadges = trpc.level.listAllBadges.useQuery(undefined, { retry: false });
  const myBadges = trpc.level.getUserBadges.useQuery(undefined, { retry: false });

  const grouped = useMemo(() => {
    const source = (((allBadges.data ?? []) as any[]).length ? (allBadges.data as any[]) : (myBadges.data as any[])) ?? [];
    const honor = source.filter((badge) => !String(badge.category ?? badge.name ?? "").toLowerCase().includes("event") && !String(badge.name ?? "").toLowerCase().includes("pksl"));
    const event = source.filter((badge) => !honor.includes(badge));
    return { honor, event };
  }, [allBadges.data, myBadges.data]);

  const activeBadge = myLevel.data?.activeBadge ?? myBadges.data?.[0] ?? null;
  const items = tab === "honor" ? grouped.honor : grouped.event;

  return (
    <WinterScreen title="My Badge">
      <GlassPanel style={{ paddingVertical: 30, alignItems: "center", backgroundColor: "rgba(177,29,246,0.66)" }}>
        <Text style={{ fontSize: 80 }}>🎖️</Text>
        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700", marginTop: 10 }}>{String(activeBadge?.name ?? "No active badge")}</Text>
      </GlassPanel>

      <HeaderTabs items={[{ key: "honor", label: "Honor Badge" }, { key: "event", label: "Event Badge" }]} activeKey={tab} onChange={setTab} />

      <GlassPanel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {items.length ? items.map((badge: any) => <BadgeGridItem key={String(badge.id ?? badge.badgeId ?? badge.name)} name={String(badge.name ?? "Badge")} />) : (
            <View style={{ width: "100%", paddingVertical: 40 }}>
              <Text style={{ color: "rgba(255,255,255,0.68)", textAlign: "center" }}>No badges available in this category yet.</Text>
            </View>
          )}
        </View>
      </GlassPanel>
    </WinterScreen>
  );
}