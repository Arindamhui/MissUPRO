import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Card } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { router } from "expo-router";

export default function MessagesScreen() {
  const conversations = trpc.social.listConversations.useQuery({ limit: 30 }, { retry: false });
  const convList = (conversations.data?.conversations ?? []) as any[];

  return (
    <Screen>
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: COLORS.text }}>Messages</Text>
      </View>

      <FlatList
        data={convList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: SPACING.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/chat/${item.id}`)}
            style={{
              flexDirection: "row", alignItems: "center", paddingVertical: SPACING.sm + 4,
              borderBottomWidth: 1, borderBottomColor: COLORS.border,
            }}
          >
            <Avatar uri={item.otherUser?.profileImage} size={52} online={item.otherUser?.isOnline} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text }}>{item.otherUser?.displayName ?? "User"}</Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{item.lastMessageAt ?? ""}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, flex: 1 }} numberOfLines={1}>
                  {item.lastMessage ?? "Start a conversation"}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={{
                    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
                    minWidth: 20, height: 20, alignItems: "center", justifyContent: "center",
                    paddingHorizontal: 6,
                  }}>
                    <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "700" }}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: SPACING.xxl }}>
            <Text style={{ fontSize: 48, marginBottom: SPACING.sm }}>💬</Text>
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text }}>No Messages</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>Start a conversation!</Text>
          </View>
        }
      />
    </Screen>
  );
}
