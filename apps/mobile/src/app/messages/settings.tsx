import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { LinearGradient } from "expo-linear-gradient";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, SPACING, RADIUS } from "@/theme";

type InboxPreferences = {
  dmPrivacyRule?: "ALL_USERS" | "FOLLOWED_USERS" | "HIGHER_LEVEL_USERS";
  allowLiveStreamLinks?: boolean;
};

const DM_OPTIONS: Array<{ key: "ALL_USERS" | "FOLLOWED_USERS" | "HIGHER_LEVEL_USERS"; label: string }> = [
  { key: "ALL_USERS", label: "All users" },
  { key: "FOLLOWED_USERS", label: "Users on followed list" },
  { key: "HIGHER_LEVEL_USERS", label: "Higher level users" },
];

export default function InboxSettingsScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
  const preferencesQuery = trpc.user.getInboxPreferences.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const updatePreferences = trpc.user.updateInboxPreferences.useMutation({
    onError: (error: unknown) => {
      Alert.alert("Update failed", error instanceof Error ? error.message : "Please try again.");
      void preferencesQuery.refetch();
    },
  });

  const [dmPrivacyRule, setDmPrivacyRule] = useState<"ALL_USERS" | "FOLLOWED_USERS" | "HIGHER_LEVEL_USERS">("ALL_USERS");
  const [allowLiveStreamLinks, setAllowLiveStreamLinks] = useState(true);

  useEffect(() => {
    const preferences = preferencesQuery.data as InboxPreferences | undefined;
    if (!preferences) return;
    setDmPrivacyRule(preferences.dmPrivacyRule ?? "ALL_USERS");
    setAllowLiveStreamLinks(Boolean(preferences.allowLiveStreamLinks ?? true));
  }, [preferencesQuery.data]);

  const persistPrivacyRule = (value: "ALL_USERS" | "FOLLOWED_USERS" | "HIGHER_LEVEL_USERS") => {
    setDmPrivacyRule(value);
    updatePreferences.mutate({ dmPrivacyRule: value });
  };

  const persistLiveStreamLinks = (value: boolean) => {
    setAllowLiveStreamLinks(value);
    updatePreferences.mutate({ allowLiveStreamLinks: value });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0A111B" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(10,17,27,0.24)", "rgba(8,14,23,0.92)", "rgba(8,14,23,1)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={6} />

      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: SPACING.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, justifyContent: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={34} />
          </TouchableOpacity>
          <Text style={{ color: COLORS.white, fontSize: 26, fontWeight: "800", marginLeft: 8 }}>Inbox</Text>
        </View>

        {!isAuthenticated ? (
          <Text style={{ color: COLORS.white, fontSize: 16 }}>Sign in to manage inbox settings.</Text>
        ) : preferencesQuery.isLoading ? (
          <View style={{ paddingTop: 80, alignItems: "center" }}>
            <ActivityIndicator color="#5BD6FF" size="large" />
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: -SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: 16, marginBottom: 4 }}>
              <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: 15 }}>Accept private messages from</Text>
            </View>

            <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: RADIUS.lg, overflow: "hidden", marginBottom: 22 }}>
              {DM_OPTIONS.map((option, index) => {
                const selected = dmPrivacyRule === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => persistPrivacyRule(option.key)}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottomWidth: index < DM_OPTIONS.length - 1 ? 1 : 0,
                      borderBottomColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: selected ? "700" : "500" }}>{option.label}</Text>
                    {selected ? <MaterialCommunityIcons color="#67E7FF" name="check" size={28} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: -SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: 16, marginBottom: 4 }}>
              <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: 15 }}>Message types to receive</Text>
            </View>

            <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: RADIUS.lg, overflow: "hidden" }}>
              <View style={{
                paddingHorizontal: 18,
                paddingVertical: 18,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "500" }}>Live stream link</Text>
                <Switch
                  value={allowLiveStreamLinks}
                  onValueChange={persistLiveStreamLinks}
                  trackColor={{ false: "rgba(255,255,255,0.22)", true: "#53D7FF" }}
                  thumbColor={allowLiveStreamLinks ? "#F6F1F1" : "#FAFAFA"}
                />
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}