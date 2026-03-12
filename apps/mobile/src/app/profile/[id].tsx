import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Badge, Card, Button, CoinDisplay, SectionHeader } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useCallStore, useUIStore } from "@/store";
import { useSocket } from "@/hooks/useSocket";
import { SOCKET_EVENTS } from "@missu/types";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { emit } = useSocket();

  const profile = trpc.discovery.modelCard.useQuery({ modelId: id! }, { retry: false, enabled: !!id });
  const model = profile.data as any;

  const startCall = (type: "audio" | "video") => {
    const callId = `call_${Date.now()}`;
    useCallStore.getState().startCall(callId, type, id!);
    emit(SOCKET_EVENTS.CALL.REQUEST, { targetUserId: id, callType: type, callSessionId: callId });
    router.push(`/call/${callId}`);
  };

  return (
    <Screen scroll>
      {/* Profile Header */}
      <View style={{ alignItems: "center", paddingVertical: SPACING.lg }}>
        <Avatar uri={model?.profileImage} size={120} online={model?.isOnline} />
        <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.text, marginTop: SPACING.md }}>
          {model?.displayName ?? "Model"}
        </Text>
        <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm }}>
          {model?.isOnline && <Badge text="Online" color={COLORS.success} />}
          <Badge text={`Lv.${model?.level ?? 1}`} color={COLORS.primary} />
          {model?.isVerified && <Badge text="Verified" color={COLORS.primary} />}
        </View>
        {model?.bio && (
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.sm, textAlign: "center", paddingHorizontal: SPACING.lg }}>
            {model.bio}
          </Text>
        )}
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: SPACING.lg }}>
        {[
          { label: "Followers", value: model?.followerCount ?? 0 },
          { label: "Rating", value: model?.avgRating ? `${model.avgRating.toFixed(1)} ★` : "N/A" },
          { label: "Calls", value: model?.totalCalls ?? 0 },
        ].map((stat) => (
          <View key={stat.label} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>{stat.value}</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Call Actions */}
      <View style={{ flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg }}>
        <Button
          title="🎙️ Audio Call"
          onPress={() => startCall("audio")}
          style={{ flex: 1 }}
          variant="primary"
        />
        <Button
          title="📹 Video Call"
          onPress={() => startCall("video")}
          style={{ flex: 1 }}
          variant="outline"
        />
      </View>

      {/* Pricing */}
      <Card>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: SPACING.sm }}>Call Pricing</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Audio</Text>
            <CoinDisplay amount={model?.audioPrice ?? 30} size="sm" />
            <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>/min</Text>
          </View>
          <View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Video</Text>
            <CoinDisplay amount={model?.videoPrice ?? 50} size="sm" />
            <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>/min</Text>
          </View>
        </View>
      </Card>

      {/* Gift */}
      <TouchableOpacity
        onPress={() => useUIStore.getState().openGiftDrawer({ userId: id!, context: "profile" })}
        style={{
          marginTop: SPACING.sm,
          padding: SPACING.md, borderRadius: RADIUS.lg,
          backgroundColor: COLORS.primaryLight, alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 22 }}>🎁</Text>
        <Text style={{ color: COLORS.primary, fontWeight: "600", marginTop: 4 }}>Send Gift</Text>
      </TouchableOpacity>

      {/* Follow / DM */}
      <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
        <Button title="Follow" variant="secondary" onPress={() => {}} style={{ flex: 1 }} />
        <Button title="Message" variant="ghost" onPress={() => router.push(`/chat/${id}`)} style={{ flex: 1 }} />
      </View>

      {/* Gallery placeholder */}
      <SectionHeader title="Gallery" />
      <Card>
        <Text style={{ color: COLORS.textSecondary }}>Photo and video gallery</Text>
      </Card>

      {/* Reviews placeholder */}
      <SectionHeader title="Reviews" />
      <Card>
        <Text style={{ color: COLORS.textSecondary }}>User reviews and ratings</Text>
      </Card>
    </Screen>
  );
}
