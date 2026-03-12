import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Badge, Card, SectionHeader } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { router } from "expo-router";

export default function LiveScreen() {
  const streams = trpc.live.activeStreams.useQuery(undefined, { retry: false });
  const streamList = (streams.data?.streams ?? []) as any[];

  return (
    <Screen>
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md }}>
        {/* Categories */}
        <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg }}>
          {["🔥 Hot", "🆕 New", "🎮 Gaming", "🎵 Music", "💬 Chat"].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
                backgroundColor: COLORS.surface,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "500", color: COLORS.text }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={streamList}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.sm }}
        columnWrapperStyle={{ gap: SPACING.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/stream/${item.id}`)}
            style={{
              flex: 1, borderRadius: RADIUS.lg, overflow: "hidden",
              marginBottom: SPACING.sm, backgroundColor: COLORS.card,
              shadowColor: COLORS.black, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
            }}
          >
            <View style={{ height: 200, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 48 }}>📺</Text>
              {/* Viewer count overlay */}
              <View style={{ position: "absolute", top: 8, right: 8, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full }}>
                <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "600" }}>👁 {item.viewerCount ?? 0}</Text>
              </View>
              {/* Live badge */}
              <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full }}>
                <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "700" }}>LIVE</Text>
              </View>
            </View>
            <View style={{ padding: SPACING.sm, flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
              <Avatar uri={item.hostAvatar} size={32} online />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }} numberOfLines={1}>{item.title ?? "Live Stream"}</Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{item.hostName ?? "Host"}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: SPACING.xxl }}>
            <Text style={{ fontSize: 48, marginBottom: SPACING.sm }}>📺</Text>
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text }}>No Live Streams</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>Check back later!</Text>
          </View>
        }
      />
    </Screen>
  );
}
