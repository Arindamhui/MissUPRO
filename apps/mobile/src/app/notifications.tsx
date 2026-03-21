import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Screen, Card, EmptyState } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useAuthStore } from "@/store";
import { router } from "expo-router";

type Notification = {
  id: string;
  notificationType?: string;
  title?: string;
  body?: string;
  iconUrl?: string;
  deepLink?: string;
  metadataJson?: Record<string, unknown> | null;
  isRead?: boolean;
  createdAt?: string;
};

const ICON_MAP: Record<string, string> = {
  NEW_FOLLOWER: "👤",
  LIVE_STARTED: "🔴",
  GIFT_RECEIVED: "🎁",
  CALL_MISSED: "📞",
  LEVEL_UP: "⬆️",
  EVENT_STARTED: "📅",
  SYSTEM: "ℹ️",
  PAYOUT_COMPLETED: "💰",
  MODEL_APPROVED: "✅",
  MODEL_APPLICATION_UPDATE: "🏷️",
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
  const notifications = trpc.notification.getNotificationCenter.useQuery(
    { limit: 50 },
    { retry: false, enabled: isAuthenticated }
  );
  const markRead = trpc.notification.markAsRead.useMutation();
  const markAllRead = trpc.notification.markAllAsRead.useMutation();

  const items = (notifications.data?.items ?? []) as Notification[];
  const unreadCount = items.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => notifications.refetch(),
    });
  };

  const handlePress = (item: Notification) => {
    if (!item.isRead) {
      markRead.mutate(
        { notificationId: item.id },
        { onSuccess: () => notifications.refetch() }
      );
    }
    const deepLink = item.deepLink ?? (item.metadataJson?.deepLink as string | undefined);
    if (deepLink) {
      router.push(deepLink as never);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity onPress={() => handlePress(item)}>
      <Card
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.sm,
          opacity: item.isRead ? 0.7 : 1,
          marginBottom: SPACING.sm,
          backgroundColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        <Text style={{ fontSize: 28 }}>
          {ICON_MAP[item.notificationType ?? "SYSTEM"] ?? "🔔"}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: item.isRead ? "400" : "700", color: COLORS.white }}>
            {item.title ?? "Notification"}
          </Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 2 }} numberOfLines={2}>
            {item.body ?? ""}
          </Text>
          {item.createdAt && (
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.56)", marginTop: 4 }}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>
        {!item.isRead && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={10} />

      <Screen style={{ backgroundColor: "transparent" }}>
        <FlatList
          data={isAuthenticated ? items : []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.md, paddingTop: insets.top + 6, paddingBottom: 124 }}
          ListHeaderComponent={
            <>
              <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800", marginBottom: 6 }}>Notifications</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: SPACING.md }}>Follows, gifts, calls, and system updates from your account activity.</Text>
              {isAuthenticated && unreadCount > 0 ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, marginBottom: SPACING.sm }}>
                  <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.72)" }}>{unreadCount} unread</Text>
                  <TouchableOpacity onPress={handleMarkAllRead}>
                    <Text style={{ fontSize: 14, color: "#9BC9FF", fontWeight: "700" }}>Mark all read</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            isAuthenticated ? (
              <EmptyState icon="🔔" title="No Notifications" subtitle="You're all caught up!" />
            ) : (
              <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Sign in required</Text>
                <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>Notification center data is tied to your user account.</Text>
              </Card>
            )
          }
        />
      </Screen>
    </View>
  );
}
