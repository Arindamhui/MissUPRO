import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Badge } from "@/components/ui";
import { GlassPanel, HeaderTabs, NeonEmptyState, WinterScreen } from "@/components/me-winter";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

export default function BagScreen() {
  const [tab, setTab] = useState("cars");
  const ownedThemes = trpc.party.listOwnedThemes.useQuery(undefined, { retry: false });
  const items = useMemo(() => (ownedThemes.data ?? []) as any[], [ownedThemes.data]);

  return (
    <WinterScreen title="My Bag">
      <GlassPanel style={{ paddingVertical: 30, alignItems: "center" }}>
        <Text style={{ fontSize: 72 }}>🏎️</Text>
        <Text style={{ color: "rgba(255,255,255,0.56)", fontSize: 13, marginTop: 8 }}>Get VIP/Frame</Text>
        <Text style={{ color: "rgba(255,255,255,0.56)", fontSize: 13, marginTop: 4 }}>Lucky ID/Car!</Text>
      </GlassPanel>

      <HeaderTabs items={[{ key: "cars", label: "Cars" }, { key: "profile", label: "Profile" }, { key: "frame", label: "Frame" }, { key: "vip", label: "VIP" }, { key: "lucky", label: "Lucky ID" }]} activeKey={tab} onChange={setTab} />

      {tab === "cars" && items.length ? (
        <GlassPanel>
          {items.map((item) => (
            <TouchableOpacity key={String(item.ownershipId ?? item.themeId)} onPress={() => router.push("/(tabs)/live" as never)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>{String(item.themeName ?? "Garage item")}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 5 }}>{String(item.description ?? "Owned customization item")}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Badge text={item.isPremium ? "Premium" : "Standard"} color={item.isPremium ? "#FF89D9" : "#75E5AF"} />
                    <Badge text={`Paid ${Number(item.purchasePriceCoins ?? 0)} coins`} color="#FFD37A" />
                  </View>
                </View>
                <MaterialCommunityIcons color="#5CD6FF" name="chevron-right" size={26} />
              </View>
            </TouchableOpacity>
          ))}
        </GlassPanel>
      ) : (
        <NeonEmptyState title="No data" subtitle={tab === "cars" ? "Unlock garage items from the store and they will show up here." : "Nothing has been unlocked in this section yet."} />
      )}
    </WinterScreen>
  );
}