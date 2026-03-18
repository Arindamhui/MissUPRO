import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Avatar, Card } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING } from "@/theme";

const RULE_LABELS = {
  ALL_USERS: "All users",
  FOLLOWED_USERS: "Users on followed list",
  HIGHER_LEVEL_USERS: "Higher level users",
} as const;

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const preferences = trpc.user.getInboxPreferences.useQuery(undefined, { retry: false });
  const blockedUsers = trpc.user.getBlockedUsers.useQuery(undefined, { retry: false });
  const updatePreferences = trpc.user.updateInboxPreferences.useMutation({
    onSuccess: () => void preferences.refetch(),
  });

  const currentRule = String(preferences.data?.dmPrivacyRule ?? "ALL_USERS") as keyof typeof RULE_LABELS;

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={8} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={24} />
        </TouchableOpacity>
        <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "900", marginBottom: 16 }}>Privacy</Text>
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800", marginBottom: 12 }}>Accept private messages from</Text>
          {Object.entries(RULE_LABELS).map(([key, label], index, array) => {
            const active = key === currentRule;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => updatePreferences.mutate({ dmPrivacyRule: key as keyof typeof RULE_LABELS })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 16,
                  borderBottomWidth: index < array.length - 1 ? 1 : 0,
                  borderBottomColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: active ? "700" : "500" }}>{label}</Text>
                <MaterialCommunityIcons color={active ? "#FF4C4C" : "rgba(255,255,255,0.26)"} name={active ? "radiobox-marked" : "radiobox-blank"} size={22} />
              </TouchableOpacity>
            );
          })}
        </Card>

        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800", marginBottom: 8 }}>Inbox safety</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "600" }}>Allow live stream links</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Blocked at send time across API and realtime chat.</Text>
            </View>
            <Switch
              value={preferences.data?.allowLiveStreamLinks ?? true}
              onValueChange={(value) => updatePreferences.mutate({ allowLiveStreamLinks: value })}
              trackColor={{ false: "rgba(255,255,255,0.18)", true: "rgba(255,90,90,0.4)" }}
              thumbColor={(preferences.data?.allowLiveStreamLinks ?? true) ? "#FF4C4C" : "#E7EDF7"}
            />
          </View>
        </Card>

        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800", marginBottom: 12 }}>Blocked users</Text>
          {(blockedUsers.data ?? []).length ? (blockedUsers.data ?? []).map((entry: any, index: number, array: any[]) => (
            <View key={String(entry.id ?? index)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: index < array.length - 1 ? 1 : 0, borderBottomColor: "rgba(255,255,255,0.08)" }}>
              <Avatar size={38} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "600" }}>{String(entry.blockedUserId ?? "Blocked user")}</Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{String(entry.reason ?? "Blocked from your account")}</Text>
              </View>
            </View>
          )) : <Text style={{ color: "rgba(255,255,255,0.62)", lineHeight: 22 }}>You have not blocked any users yet.</Text>}
        </Card>
      </ScrollView>
    </View>
  );
}