import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { Avatar, Button, Card, EmptyState, Screen } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, SPACING } from "@/theme";

export default function FollowingRoute() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const following = trpc.user.listFollowing.useQuery({ userId, limit: 40 }, { retry: false, enabled: isAuthenticated });
  const items = (following.data?.items ?? []) as any[];

  if (!isAuthenticated) {
    return (
      <Screen scroll>
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>Sign in to view following</Text>
          <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: SPACING.md }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll style={{ backgroundColor: "#0C1345" }}>
      <View style={{ padding: SPACING.md }}>
        <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900", marginBottom: 6 }}>Following</Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", marginBottom: SPACING.lg }}>Creators, friends, and accounts this profile currently follows.</Text>
        {items.length > 0 ? items.map((person) => (
          <TouchableOpacity
            key={String(person.id)}
            onPress={() => router.push(`/profile/${String(person.userId)}` as never)}
            style={{ marginBottom: SPACING.sm }}
          >
            <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", flexDirection: "row", alignItems: "center" }}>
              <Avatar uri={person.avatarUrl} size={52} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>{person.displayName ?? person.username ?? "User"}</Text>
                <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, marginTop: 2 }} numberOfLines={1}>{person.bio ?? person.locationDisplay ?? "Following"}</Text>
              </View>
              <Text style={{ color: "#67E7FF", fontSize: 12, fontWeight: "700" }}>View</Text>
            </Card>
          </TouchableOpacity>
        )) : <EmptyState icon="✨" title="Not following anyone yet" subtitle="Followed accounts will appear here for fast access." />}
      </View>
    </Screen>
  );
}