import React, { useMemo, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Avatar, Button, Card, Screen } from "@/components/ui";
import { useAuthStore } from "@/store";
import { COLORS, RADIUS, SPACING } from "@/theme";

export default function CallRequestRoute() {
  const params = useLocalSearchParams<{ type?: string }>();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
  const initialType = String(params.type ?? "audio").toLowerCase() === "video" ? "video" : "audio";
  const [callType, setCallType] = useState<"audio" | "video">(initialType);
  const onlineModels = trpc.discovery.getOnlineModels.useQuery({ limit: 20 }, { retry: false, enabled: isAuthenticated });
  const items = useMemo(() => (onlineModels.data?.items ?? []) as any[], [onlineModels.data?.items]);

  if (!isAuthenticated) {
    return (
      <Screen>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>Sign in required</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 20 }}>
            Call requests depend on creator availability and pricing previews from your account.
          </Text>
          <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: SPACING.md }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ padding: SPACING.md }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text }}>Request a Call</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>
          Pick an online creator, then confirm the {callType} call from the profile screen with live pricing and availability.
        </Text>

        <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md, marginBottom: SPACING.md }}>
          {(["audio", "video"] as const).map((value) => {
            const active = value === callType;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setCallType(value)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: RADIUS.full,
                  backgroundColor: active ? COLORS.primary : COLORS.surface,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: active ? COLORS.white : COLORS.text, fontWeight: "700", textTransform: "capitalize" }}>{value}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, index) => String(item.userId ?? item.modelId ?? item.id ?? index)}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl }}
        renderItem={({ item }) => {
          const targetId = String(item.userId ?? item.modelId ?? item.id ?? "");
          const price = callType === "video" ? Number(item.videoPrice ?? 50) : Number(item.audioPrice ?? 30);
          return (
            <TouchableOpacity
              onPress={() => router.push(`/profile/${targetId}` as never)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: SPACING.md,
                borderRadius: RADIUS.lg,
                backgroundColor: COLORS.card,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginBottom: SPACING.sm,
              }}
            >
              <Avatar uri={item.avatarUrl ?? item.profileImage} size={56} online={item.isOnline} />
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>{item.displayName ?? "Creator"}</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{price} coins/min</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: "700" }}>ONLINE</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 4, fontSize: 12 }}>Open profile</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Card style={{ margin: SPACING.md }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>No online creators</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>
              No creators are currently online for live call requests.
            </Text>
          </Card>
        }
      />
    </Screen>
  );
}