import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Avatar } from "@/components/ui";
import { GlassPanel, HeaderTabs, NeonEmptyState, WinterScreen } from "@/components/me-winter";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

function PersonRow({
  name,
  avatarUrl,
  subtitle,
  onPress,
}: {
  name: string;
  avatarUrl?: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
      <Avatar uri={avatarUrl} size={58} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>{name}</Text>
        <Text style={{ color: "rgba(255,255,255,0.64)", fontSize: 13, marginTop: 4 }}>{subtitle}</Text>
      </View>
      <View style={{ minWidth: 42, alignItems: "flex-end" }}>
        <Text style={{ color: "#58D7FF", fontSize: 24, fontWeight: "300" }}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PeopleScreen() {
  const [tab, setTab] = useState("following");
  const following = trpc.user.listFollowing.useQuery({ limit: 100 }, { retry: false });
  const followers = trpc.user.listFollowers.useQuery({ limit: 100 }, { retry: false });
  const roster = trpc.agency.getHostRoster.useQuery({ limit: 50 }, { retry: false });

  const items = useMemo(() => {
    if (tab === "managed") {
      return ((roster.data?.items ?? []) as any[]).map((item) => ({
        id: String(item.userId ?? item.id),
        name: String(item.displayName ?? "Agency member"),
        avatarUrl: String(item.avatarUrl ?? "") || undefined,
        subtitle: item.isOnline ? "Online now" : "Managed account",
      }));
    }
    if (tab === "history") {
      return ((followers.data?.items ?? []) as any[]).map((item) => ({
        id: String(item.userId ?? item.id),
        name: String(item.displayName ?? item.username ?? "Follower"),
        avatarUrl: String(item.avatarUrl ?? "") || undefined,
        subtitle: "Recent follower",
      }));
    }
    return ((following.data?.items ?? []) as any[]).map((item) => ({
      id: String(item.userId ?? item.id),
      name: String(item.displayName ?? item.username ?? "Following"),
      avatarUrl: String(item.avatarUrl ?? "") || undefined,
      subtitle: item.isOnline ? "Online" : "Offline",
    }));
  }, [followers.data?.items, following.data?.items, roster.data?.items, tab]);

  return (
    <WinterScreen title="My People">
      <HeaderTabs items={[{ key: "following", label: "Following" }, { key: "managed", label: "Managed" }, { key: "history", label: "History" }]} activeKey={tab} onChange={setTab} />
      <GlassPanel>
        {items.length ? items.map((item) => (
          <PersonRow key={item.id} name={item.name} avatarUrl={item.avatarUrl} subtitle={item.subtitle} onPress={() => router.push(`/profile/${item.id}` as never)} />
        )) : <NeonEmptyState title="No data" subtitle={tab === "managed" ? "No managed users are assigned to you yet." : "Nothing to show in this section yet."} />}
      </GlassPanel>
    </WinterScreen>
  );
}