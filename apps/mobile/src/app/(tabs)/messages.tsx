import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Avatar, Button, Card } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { router } from "expo-router";
import { useAuthStore } from "@/store";

type ConversationRecord = {
  id: string;
  unreadCount?: number;
  lastMessage?: string | null;
  lastMessageAt?: string | Date | null;
  otherUser?: {
    userId?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    profileImage?: string | null;
  } | null;
};

type NotificationRecord = {
  id: string;
  title?: string | null;
  body?: string | null;
  createdAt?: string | Date | null;
};

type FollowingRecord = {
  userId?: string;
};

function formatInboxTimestamp(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay = now.toDateString() === date.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "2-digit", day: "2-digit" });
}

function renderBadgeCount(value: number) {
  if (value <= 0) return null;
  return value > 99 ? "99+" : String(value);
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
  const conversations = trpc.social.listConversations.useQuery({ limit: 30 }, { retry: false, enabled: isAuthenticated });
  const notifications = trpc.notification.getNotificationCenter.useQuery({ limit: 20 }, { retry: false, enabled: isAuthenticated });
  const following = trpc.user.listFollowing.useQuery({ limit: 100 }, { retry: false, enabled: isAuthenticated });
  const registerPushToken = trpc.user.registerPushToken.useMutation();
  const convList = (conversations.data?.conversations ?? []) as ConversationRecord[];
  const noticeList = (notifications.data?.items ?? []) as NotificationRecord[];
  const followingList = (following.data?.items ?? []) as FollowingRecord[];
  const [pushPermissionState, setPushPermissionState] = useState<"loading" | "granted" | "denied">("loading");
  const [pushBannerDismissed, setPushBannerDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void Notifications.getPermissionsAsync()
      .then((permission) => {
        if (cancelled) return;
        const granted = permission.granted || permission.status === "granted";
        setPushPermissionState(granted ? "granted" : "denied");
      })
      .catch(() => {
        if (!cancelled) {
          setPushPermissionState("denied");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const friendIds = useMemo(() => new Set(followingList.map((item) => String(item.userId ?? "")).filter(Boolean)), [followingList]);

  const friendConversations = useMemo(
    () => convList.filter((item) => friendIds.has(String(item.otherUser?.userId ?? ""))),
    [convList, friendIds],
  );
  const nonFriendConversations = useMemo(
    () => convList.filter((item) => !friendIds.has(String(item.otherUser?.userId ?? ""))),
    [convList, friendIds],
  );
  const unreadConversationCount = convList.reduce((sum, item) => sum + Number(item.unreadCount ?? 0), 0);
  const unreadNotificationCount = Number(notifications.data?.unreadCount ?? noticeList.length);
  const topNotice = noticeList[0] ?? null;
  const topConversation = convList[0] ?? null;
  const topFriendConversation = friendConversations[0] ?? null;
  const topNonFriendConversation = nonFriendConversations[0] ?? null;
  const showPushBanner = !pushBannerDismissed && pushPermissionState !== "granted";

  const handleEnablePush = async () => {
    try {
      const permission = await Notifications.requestPermissionsAsync();
      const granted = permission.granted || permission.status === "granted";
      setPushPermissionState(granted ? "granted" : "denied");
      if (granted) {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        const token = String(deviceToken.data ?? "").trim();
        if (token) {
          await registerPushToken.mutateAsync({
            token,
            platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
            deviceId: `${Platform.OS}:${token.slice(0, 18)}`,
          });
        }
      }
      if (!granted) {
        Alert.alert("Notifications off", "Push notifications are still disabled on this device.");
      }
    } catch (error) {
      Alert.alert("Notifications unavailable", error instanceof Error ? error.message : "Unable to request notification access on this device right now.");
    }
  };

  const openConversation = (conversation?: ConversationRecord | null) => {
    if (!conversation?.id) {
      router.push("/chat");
      return;
    }
    router.push(`/chat/${conversation.id}`);
  };

  const nonFriendBadge = renderBadgeCount(nonFriendConversations.reduce((sum, item) => sum + Number(item.unreadCount ?? 0), 0));

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={12} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 124 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.md }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.white }}>Inbox</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <TouchableOpacity onPress={() => router.push("/messages/friends")}>
              <MaterialCommunityIcons color="rgba(255,255,255,0.92)" name="account-multiple-outline" size={28} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/messages/settings")}>
              <MaterialCommunityIcons color="rgba(255,255,255,0.92)" name="cog-outline" size={28} />
            </TouchableOpacity>
          </View>
        </View>

        {!isAuthenticated ? (
          <Card style={{ backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Sign in required</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>
              Inbox data, friend lists, and private-message permissions are tied to your account.
            </Text>
            <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 14 }} />
          </Card>
        ) : (
          <>
            {showPushBanner ? (
              <View style={{
                borderRadius: 18,
                overflow: "hidden",
                marginBottom: SPACING.lg,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}>
                <LinearGradient colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.12)"]} style={{ padding: 18 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "700" }}>Allow Push Notifications</Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginTop: 6, lineHeight: 20 }}>
                        Don&apos;t miss out on all the fun happening on SK!
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleEnablePush} style={{ borderRadius: 22, overflow: "hidden", marginRight: 14 }}>
                      <LinearGradient colors={["#D653F2", "#46C8FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                        <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "800" }}>Open Now</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPushBannerDismissed(true)}>
                      <MaterialCommunityIcons color="rgba(255,255,255,0.6)" name="close" size={24} />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            ) : null}

            <TouchableOpacity onPress={() => router.push("/notifications")} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.12)" }}>
                <View style={{ width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(173,92,255,0.2)" }}>
                  <MaterialCommunityIcons color="#D06BFF" name="bullhorn-outline" size={30} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>New Notices</Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginTop: 6 }} numberOfLines={1}>
                    {topNotice?.title ?? topNotice?.body ?? "Platform notices, event drops, and important updates."}
                  </Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginRight: 12 }}>{formatInboxTimestamp(topNotice?.createdAt)}</Text>
                {renderBadgeCount(unreadNotificationCount) ? (
                  <View style={{ minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 8, backgroundColor: "#FF503A", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 12 }}>{renderBadgeCount(unreadNotificationCount)}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openConversation(topConversation)} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.12)" }}>
                <View style={{ width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(85,190,255,0.2)" }}>
                  <MaterialCommunityIcons color="#78D2FF" name="account-circle-outline" size={34} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>SK Play Assistant</Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginTop: 6 }} numberOfLines={1}>
                    {topConversation?.lastMessage ?? "Unread direct messages and assistant updates stay grouped here."}
                  </Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginRight: 12 }}>{formatInboxTimestamp(topConversation?.lastMessageAt)}</Text>
                {renderBadgeCount(unreadConversationCount) ? (
                  <View style={{ minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 8, backgroundColor: "#FF503A", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 12 }}>{renderBadgeCount(unreadConversationCount)}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/messages/friends")} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.12)" }}>
                <View style={{ width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(61,132,255,0.2)" }}>
                  <MaterialCommunityIcons color="#69ABFF" name="account-star-outline" size={30} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Talent Assistant</Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginTop: 6 }} numberOfLines={1}>
                    {topFriendConversation?.lastMessage ?? `${followingList.length} followed contacts ready in your friends list.`}
                  </Text>
                </View>
                {followingList.length > 0 ? (
                  <View style={{ minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 8, backgroundColor: "#FF503A", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 12 }}>{renderBadgeCount(followingList.length)}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openConversation(topNonFriendConversation)} style={{ marginTop: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}>
                <View style={{ width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(210,155,255,0.16)" }}>
                  <MaterialCommunityIcons color="#E8E3FF" name="account-outline" size={30} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Non-Friend Messages</Text>
                  <Text style={{ color: "rgba(255,255,255,0.56)", fontSize: 14, marginTop: 6 }} numberOfLines={1}>
                    {topNonFriendConversation?.lastMessage ?? "Messages from accounts outside your followed list appear here."}
                  </Text>
                </View>
                {nonFriendBadge ? (
                  <View style={{ minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 8, backgroundColor: "#FF503A", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 12 }}>{nonFriendBadge}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>

            {convList.length === 0 ? (
              <View style={{ paddingTop: 80, alignItems: "center" }}>
                <Avatar uri={undefined} size={84} />
                <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "700", marginTop: 18 }}>No conversations yet</Text>
                <Text style={{ color: "rgba(255,255,255,0.66)", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
                  Notices, assistants, and private threads will appear here once activity starts.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
