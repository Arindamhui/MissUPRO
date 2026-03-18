import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Avatar } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, SPACING } from "@/theme";

type FriendRecord = {
  id: string;
  userId?: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  locationDisplay?: string | null;
};

export default function InboxFriendsScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
  const following = trpc.user.listFollowing.useQuery({ limit: 60 }, { retry: false, enabled: isAuthenticated });
  const items = (following.data?.items ?? []) as FriendRecord[];

  return (
    <View style={{ flex: 1, backgroundColor: "#071121" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(7,17,33,0.2)", "rgba(5,12,24,0.9)", "rgba(5,10,20,1)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={8} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingHorizontal: SPACING.md, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, justifyContent: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={34} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: COLORS.white, fontSize: 26, fontWeight: "800", marginLeft: 8 }}>Friends List</Text>
          <TouchableOpacity onPress={() => Alert.alert("Friends List", "Accounts you follow appear here for quick access to messaging and profiles.")}>
            <MaterialCommunityIcons color="rgba(255,255,255,0.92)" name="help-circle-outline" size={28} />
          </TouchableOpacity>
        </View>

        {!isAuthenticated ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 120 }}>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Sign in to view your friends list</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 220 }}>
            <LinearGradient colors={["#32F1E8", "#D554FF", "#52A5FF"]} style={{ width: 124, height: 124, borderRadius: 62, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
              <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: "#071121", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons color="#6DEFFF" name="chat-processing-outline" size={58} />
              </View>
            </LinearGradient>
            <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 18, fontWeight: "500" }}>No data</Text>
          </View>
        ) : (
          <View style={{ paddingTop: 28 }}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(`/chat/${String(item.userId ?? item.id)}?recipientId=${String(item.userId ?? item.id)}`)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Avatar uri={item.avatarUrl ?? undefined} size={52} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "700" }}>{item.displayName ?? item.username ?? "Friend"}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.66)", fontSize: 13, marginTop: 5 }} numberOfLines={1}>
                    {item.bio ?? item.locationDisplay ?? "Followed contact"}
                  </Text>
                </View>
                <MaterialCommunityIcons color="rgba(255,255,255,0.6)" name="chevron-right" size={24} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}