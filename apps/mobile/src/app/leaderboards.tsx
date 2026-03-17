import React, { useState } from "react";
import { router } from "expo-router";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Screen, Card, Avatar, EmptyState, Button } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, SPACING, RADIUS } from "@/theme";

type LeaderboardEntry = {
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  rank?: number;
  rankPosition?: number;
  score?: number;
  scoreValue?: number;
};

type Leaderboard = {
  id: string;
  title?: string;
  leaderboardType?: string;
  windowType?: string;
};

export default function LeaderboardsScreen() {
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const boards = trpc.events.listLeaderboards.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);

  const boardList = (boards.data ?? []) as Leaderboard[];
  const activeBoard = selectedBoard ?? boardList[0]?.id;

  const entries = trpc.events.getLeaderboard.useQuery(
    { leaderboardId: activeBoard ?? "" },
    { enabled: !!activeBoard && isAuthenticated, retry: false }
  );
  const entryList = (entries.data?.items ?? []) as LeaderboardEntry[];

  if (!isAuthenticated) {
    return (
      <Screen>
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>Leaderboards unlock after sign-in</Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 8, lineHeight: 20 }}>
            Rankings are personalized and tied to protected event participation, so guest users can browse the home showcase but not open live board data.
          </Text>
          <Button title="Sign In" onPress={() => router.push("/(auth)/login")} style={{ marginTop: SPACING.md }} />
        </Card>
      </Screen>
    );
  }

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = item.rankPosition ?? item.rank ?? index + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
    return (
      <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.xs }}>
        <Text style={{ fontSize: rank <= 3 ? 28 : 16, fontWeight: "700", width: 40, textAlign: "center", color: COLORS.text }}>
          {medal}
        </Text>
        <Avatar uri={item.avatarUrl} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>{item.displayName ?? "User"}</Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.primary }}>
          {Number(item.scoreValue ?? item.score ?? 0).toLocaleString()}
        </Text>
      </Card>
    );
  };

  return (
    <Screen>
      {/* Board Tabs */}
      <FlatList
        data={boardList}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedBoard(item.id)}
            style={{
              paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
              borderRadius: RADIUS.full, marginRight: SPACING.xs,
              backgroundColor: activeBoard === item.id ? COLORS.primary : COLORS.surface,
            }}
          >
            <Text style={{
              fontSize: 14, fontWeight: "600",
              color: activeBoard === item.id ? COLORS.white : COLORS.text,
            }}>
              {item.title ?? item.leaderboardType ?? "Board"}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Entries */}
      <FlatList
        data={entryList}
        keyExtractor={(item, idx) => item.userId ?? `entry-${idx}`}
        renderItem={renderEntry}
        contentContainerStyle={{ padding: SPACING.md }}
        ListEmptyComponent={
          <EmptyState icon="🏆" title="No Entries" subtitle="Leaderboard data will appear here." />
        }
      />
    </Screen>
  );
}
