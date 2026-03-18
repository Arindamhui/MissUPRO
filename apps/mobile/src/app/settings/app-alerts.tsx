import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Card } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING } from "@/theme";

const categories = [
  { key: "MARKETING", label: "Messages and reminders" },
  { key: "EVENTS", label: "Events and live alerts" },
  { key: "FOLLOWS", label: "Followers and friend activity" },
  { key: "GIFTS", label: "Gifts and diamonds" },
  { key: "SECURITY", label: "Security and account updates" },
];

export default function AppAlertsScreen() {
  const insets = useSafeAreaInsets();
  const preferences = trpc.notification.getPreferences.useQuery(undefined, { retry: false });
  const updatePreference = trpc.notification.updatePreference.useMutation({
    onSuccess: () => void preferences.refetch(),
  });

  const preferenceMap = useMemo(() => new Map((preferences.data ?? []).map((item: any) => [`${item.category}:${item.channel}`, Boolean(item.isEnabled)])), [preferences.data]);

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
        <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "900", marginBottom: 16 }}>App Alerts</Text>
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          {categories.map((item, index) => {
            const value = preferenceMap.get(`${item.key}:PUSH`) ?? true;
            return (
              <View key={item.key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, borderBottomWidth: index < categories.length - 1 ? 1 : 0, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "600" }}>{item.label}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.58)", marginTop: 4 }}>Saved in notification preferences and applied by the backend.</Text>
                </View>
                <Switch
                  value={value}
                  onValueChange={(nextValue) => updatePreference.mutate({ category: item.key, channel: "PUSH", isEnabled: nextValue })}
                  trackColor={{ false: "rgba(255,255,255,0.18)", true: "rgba(255,90,90,0.4)" }}
                  thumbColor={value ? "#FF4C4C" : "#E7EDF7"}
                />
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </View>
  );
}