import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

type BagTab = "events" | "3d" | "popular" | "luxury" | "privilege" | "backpack";

const TAB_LABELS: Array<{ key: BagTab; label: string }> = [
  { key: "events", label: "Events" },
  { key: "3d", label: "3D" },
  { key: "popular", label: "Popular" },
  { key: "luxury", label: "Luxury" },
  { key: "privilege", label: "Privilege" },
  { key: "backpack", label: "Backpack" },
];

function classifyOwnedTheme(item: any, index: number): BagTab {
  if (!item) return "backpack";
  if (item.isPremium && index % 2 === 0) return "luxury";
  if (item.isPremium) return "privilege";
  if (String(item.themeName ?? "").toLowerCase().includes("dragon")) return "3d";
  if (String(item.themeName ?? "").toLowerCase().includes("event")) return "events";
  return index % 2 === 0 ? "popular" : "backpack";
}

export default function BagScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<BagTab>("backpack");
  const ownedThemes = trpc.party.listOwnedThemes.useQuery(undefined, { retry: false });
  const me = trpc.user.getMe.useQuery(undefined, { retry: false });

  const grouped = useMemo(() => {
    const next: Record<BagTab, any[]> = {
      events: [],
      "3d": [],
      popular: [],
      luxury: [],
      privilege: [],
      backpack: [],
    };

    ((ownedThemes.data ?? []) as any[]).forEach((item, index) => {
      next[classifyOwnedTheme(item, index)].push(item);
    });

    return next;
  }, [ownedThemes.data]);

  const activeItems = grouped[tab];

  return (
    <View style={{ flex: 1, backgroundColor: "#14051E" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(88,0,120,0.16)", "rgba(20,5,30,0.86)", "#14051E"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={10} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 34 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={28} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        <View style={{ minHeight: 240, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "rgba(10,10,16,0.76)", paddingTop: 14, paddingHorizontal: 18 }}>
          <View style={{ height: 4, width: 74, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)", alignSelf: "center", marginBottom: 18 }} />

          <LinearGradient colors={["#F158DE", "#4CC2FF"]} style={{ borderRadius: 18, padding: 2, alignSelf: "flex-start" }}>
            <View style={{ borderRadius: 16, backgroundColor: "rgba(0,0,0,0.38)", paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: COLORS.white, fontSize: 26, fontWeight: "900", marginRight: 12 }}>{String((ownedThemes.data as any[])?.length ?? 0)}</Text>
              <Text style={{ color: "rgba(255,255,255,0.86)", fontSize: 16, fontWeight: "700" }}>Inventory Items</Text>
            </View>
          </LinearGradient>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 22, paddingBottom: 14 }}>
            {TAB_LABELS.map((entry) => {
              const active = entry.key === tab;
              return (
                <TouchableOpacity key={entry.key} onPress={() => setTab(entry.key)} style={{ marginRight: 22, paddingBottom: 8, borderBottomWidth: 3, borderBottomColor: active ? "#6DE6FF" : "transparent" }}>
                  <Text style={{ color: active ? "#8DEEFF" : "rgba(255,255,255,0.56)", fontSize: 16, fontWeight: active ? "800" : "600" }}>{entry.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ borderRadius: 18, backgroundColor: "rgba(255,255,255,0.03)", padding: 18, marginBottom: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                <Text style={{ color: COLORS.white, fontSize: 32, fontWeight: "900" }}>{String(me.data?.displayName ?? me.data?.username ?? "M").slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }} numberOfLines={1}>Like me? Follow me!</Text>
                <Text style={{ color: "rgba(255,255,255,0.58)", marginTop: 6 }} numberOfLines={1}>{String(me.data?.displayName ?? me.data?.username ?? "Host profile")}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/(tabs)/me" as never)}>
                <LinearGradient colors={["#F259DF", "#53C8FF"]} style={{ borderRadius: 999, paddingHorizontal: 22, paddingVertical: 14 }}>
                  <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "900" }}>Follow</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {activeItems.length > 0 ? activeItems.map((item, index) => (
            <TouchableOpacity key={String(item.ownershipId ?? item.themeId ?? index)} onPress={() => router.push("/(tabs)/live" as never)} style={{ borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", padding: 14, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Text style={{ fontSize: 28 }}>{item.isPremium ? "👑" : index % 2 === 0 ? "🎁" : "🚗"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "800" }} numberOfLines={1}>{String(item.themeName ?? "Owned effect")}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.58)", marginTop: 4 }} numberOfLines={1}>{String(item.description ?? "Tap to use this item in your live room.")}</Text>
                </View>
                <Text style={{ color: "#FFD668", fontWeight: "800" }}>{Number(item.purchasePriceCoins ?? 0).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          )) : (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 30 }}>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>No items yet</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 22, marginTop: 8 }}>
                Unlock items from the store or event rewards and they will appear in this backpack.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}