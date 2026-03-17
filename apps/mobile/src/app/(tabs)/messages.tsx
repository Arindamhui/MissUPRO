import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Avatar, Button, Card } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { router } from "expo-router";
import { useAuthStore } from "@/store";

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
  const conversations = trpc.social.listConversations.useQuery({ limit: 30 }, { retry: false, enabled: isAuthenticated });
  const convList = (conversations.data?.conversations ?? []) as any[];

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={12} />

      <FlatList
        data={isAuthenticated ? convList : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: SPACING.md, paddingBottom: 124 }}
        ListHeaderComponent={
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.white }}>Messages</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 6 }}>Private conversations, unread badges, and chat history stay linked to your account.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/chat/${item.id}`)}
            style={{
              flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md,
              paddingHorizontal: SPACING.sm,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.1)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              marginBottom: SPACING.sm,
            }}
          >
            <Avatar uri={item.otherUser?.profileImage} size={52} online={item.otherUser?.isOnline} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.white }}>{item.otherUser?.displayName ?? "User"}</Text>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.58)" }}>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString() : ""}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", flex: 1 }} numberOfLines={1}>
                  {item.lastMessage ?? "Start a conversation"}
                </Text>
                {item.unreadCount > 0 ? (
                  <View style={{
                    backgroundColor: "rgba(102,189,255,0.96)", borderRadius: RADIUS.full,
                    minWidth: 22, height: 22, alignItems: "center", justifyContent: "center",
                    paddingHorizontal: 6,
                  }}>
                    <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "700" }}>{item.unreadCount}</Text>
                  </View>
                ) : (
                  <MaterialCommunityIcons color="rgba(255,255,255,0.42)" name="chevron-right" size={18} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isAuthenticated ? (
            <View style={{ alignItems: "center", paddingVertical: SPACING.xxl }}>
              <Text style={{ fontSize: 48, marginBottom: SPACING.sm }}>💬</Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.white }}>No Messages</Text>
              <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4 }}>Start a conversation!</Text>
            </View>
          ) : (
            <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Sign in required</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>Messages are protected account data. Sign in to load conversations and unread counts.</Text>
              <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 14 }} />
            </Card>
          )
        }
      />
    </View>
  );
}
