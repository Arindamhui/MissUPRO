import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Screen, Card, EmptyState } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING, RADIUS } from "@/theme";

type Notification = {
  id: string;
  notificationType?: string;
  title?: string;
  body?: string;
  iconUrl?: string;
  deepLink?: string;
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
};

export default function NotificationsScreen() {
  const notifications = trpc.notification.getNotificationCenter.useQuery(
    { limit: 50 },
    { retry: false }
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
        }}
      >
        <Text style={{ fontSize: 28 }}>
          {ICON_MAP[item.notificationType ?? "SYSTEM"] ?? "🔔"}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: item.isRead ? "400" : "700", color: COLORS.text }}>
            {item.title ?? "Notification"}
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }} numberOfLines={2}>
            {item.body ?? ""}
          </Text>
          {item.createdAt && (
            <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>
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
    <Screen>
      {unreadCount > 0 && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{unreadCount} unread</Text>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={{ fontSize: 14, color: COLORS.primary, fontWeight: "600" }}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.md }}
        ListEmptyComponent={
          <EmptyState icon="🔔" title="No Notifications" subtitle="You're all caught up!" />
        }
      />
    </Screen>
  );
}
