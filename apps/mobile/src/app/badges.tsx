import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

function badgeEmoji(category?: string | null, index = 0) {
  const value = String(category ?? "").toLowerCase();
  if (value.includes("vip")) return "👑";
  if (value.includes("event")) return "🎉";
  if (value.includes("wealth")) return "💰";
  if (value.includes("travel")) return "✈️";
  if (value.includes("guard")) return "🛡️";
  return ["🏅", "💎", "🥇", "⚡", "🎖️", "🏆"][index % 6] ?? "🏅";
}

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const myLevel = trpc.level.myLevel.useQuery(undefined, { retry: false });
  const myBadges = trpc.level.getUserBadges.useQuery(undefined, { retry: false });
  const allBadges = trpc.level.listAllBadges.useQuery(undefined, { retry: false });

  const badges = useMemo(() => {
    const current = ((myBadges.data ?? []) as any[]);
    if (current.length > 0) return current;
    return ((allBadges.data ?? []) as any[]).slice(0, 18);
  }, [allBadges.data, myBadges.data]);

  const activeBadge = myLevel.data?.activeBadge ?? badges[0] ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: "#08111F" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(111,185,255,0.16)", "rgba(16,24,46,0.78)", "#08111F"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={12} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={28} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <View style={{ width: 128, height: 128, borderRadius: 64, borderWidth: 3, borderColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }}>
            {activeBadge?.iconUrl ? (
              <Image source={{ uri: String(activeBadge.iconUrl) }} style={{ width: 96, height: 96, borderRadius: 24 }} />
            ) : (
              <Text style={{ fontSize: 52 }}>{badgeEmoji(activeBadge?.category)}</Text>
            )}
          </View>
          <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "300", marginTop: 16 }}>Badges ({badges.length})</Text>
          <Text style={{ color: "rgba(255,255,255,0.66)", marginTop: 8, textAlign: "center" }}>
            Your level progression, event rewards, and admin-awarded badges all surface here.
          </Text>
        </View>

        <View style={{ borderRadius: 28, backgroundColor: "rgba(255,255,255,0.98)", padding: 24 }}>
          <Text style={{ color: "#16151C", fontSize: 22, fontWeight: "800", marginBottom: 22 }}>Badges ({badges.length})</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {badges.map((badge: any, index) => (
              <View key={String(badge.badgeId ?? badge.id ?? `${badge.name}-${index}`)} style={{ width: "31%", alignItems: "center", marginBottom: 22 }}>
                <View style={{ width: 86, height: 86, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F5FA" }}>
                  {badge.iconUrl ? (
                    <Image source={{ uri: String(badge.iconUrl) }} style={{ width: 62, height: 62, borderRadius: 18 }} />
                  ) : (
                    <Text style={{ fontSize: 38 }}>{badgeEmoji(badge.category, index)}</Text>
                  )}
                </View>
                <Text style={{ color: "#2A2732", fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 10 }} numberOfLines={2}>
                  {String(badge.name ?? "Badge")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}